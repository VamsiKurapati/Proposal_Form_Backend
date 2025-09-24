const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Payment = require('../models/Payments');
const { sendEmail } = require('../utils/mailSender');

// Stripe Configuration
const STRIPE_CONFIG = {
    BILLING_CYCLES: {
        MONTHLY: 'monthly',
        YEARLY: 'yearly'
    }
};

// Create Payment Intent
const createPaymentIntent = async (req, res) => {
    try {
        const { planId, billingCycle } = req.body;
        const userId = req.user._id;

        //Enable only companies to create payment intent
        if (req.user.role !== 'company') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to create payment intent'
            });
        }

        // Validate required fields
        if (!planId || !billingCycle) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: planId, billingCycle'
            });
        }

        // Validate billing cycle
        if (!Object.values(STRIPE_CONFIG.BILLING_CYCLES).includes(billingCycle)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid billing cycle. Must be "monthly" or "yearly"'
            });
        }

        // Get plan details from database by _id and verify pricing
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(400).json({
                success: false,
                message: 'Plan not found'
            });
        }

        const expectedAmount = billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY
            ? plan.yearlyPrice
            : plan.monthlyPrice;

        // Get or create Stripe customer
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            // Create Stripe customer
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: userId
                }
            });

            stripeCustomerId = customer.id;
            user.stripeCustomerId = stripeCustomerId;
            await user.save();
        }

        // Create payment intent with verified amount from DB
        const amountInCents = Math.round(expectedAmount * 100);

        console.log('Creating payment intent with:');
        console.log('- Amount:', expectedAmount);
        console.log('- Amount in cents:', amountInCents);
        console.log('- Customer ID:', stripeCustomerId);
        console.log('- Plan:', plan.name);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            customer: stripeCustomerId,
            metadata: {
                userId: userId,
                planId: planId,
                planName: plan.name,
                billingCycle: billingCycle,
                planPriceCents: amountInCents.toString()
            },
            automatic_payment_methods: {
                enabled: true,
            },
            description: `${plan.name} subscription (${billingCycle})`
        });

        console.log('Payment Intent Created:', paymentIntent.id);
        console.log('Client Secret:', paymentIntent.client_secret);

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment intent',
            error: error.message
        });
    }
};

// Activate Subscription
const activateSubscription = async (req, res) => {
    try {
        const { paymentIntentId, planId, billingCycle } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!paymentIntentId || !planId || !billingCycle) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: paymentIntentId, planId, billingCycle'
            });
        }

        // Verify payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        console.log('Payment Intent Status:', paymentIntent.status);
        console.log('Payment Intent Amount:', paymentIntent.amount);
        console.log('Payment Intent Metadata:', paymentIntent.metadata);

        if (paymentIntent.status !== 'succeeded') {
            console.log('Payment Intent Error:', paymentIntent.last_payment_error);

            //Create payment record
            await Payment.create({
                user_id: userId,
                subscription_id: null,
                price: 0,
                status: 'Failed',
                paid_at: new Date()
            });
            return res.status(400).json({
                success: false,
                message: `Payment not completed. Status: ${paymentIntent.status}`,
                error: paymentIntent.last_payment_error?.message || 'Unknown error'
            });
        }

        // Verify the payment intent belongs to this user
        if (paymentIntent.metadata.userId !== userId) {
            //Create payment record
            await Payment.create({
                user_id: userId,
                subscription_id: null,
                price: 0,
                status: 'Failed',
                paid_at: new Date()
            });
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access to payment intent'
            });
        }

        // Validate plan and pricing again by _id
        const plan = await SubscriptionPlan.findById(planId);

        if (!plan) {
            //Create payment record
            await Payment.create({
                user_id: userId,
                subscription_id: null,
                price: 0,
                status: 'Failed',
                paid_at: new Date()
            });
            return res.status(400).json({
                success: false,
                message: 'Plan not found'
            });
        }

        // Validate metadata and amount against DB pricing
        if (paymentIntent.metadata.planId !== planId || paymentIntent.metadata.billingCycle !== billingCycle) {
            //Create payment record
            await Payment.create({
                user_id: userId,
                subscription_id: null,
                price: 0,
                status: 'Failed',
                paid_at: new Date()
            });
            return res.status(400).json({
                success: false,
                message: 'Payment intent metadata mismatch'
            });
        }

        const expectedAmount = billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice;
        const expectedAmountCents = Math.round(expectedAmount * 100);

        console.log('Expected Amount:', expectedAmount);
        console.log('Expected Amount Cents:', expectedAmountCents);
        console.log('Payment Intent Amount:', paymentIntent.amount);

        if (paymentIntent.amount !== expectedAmountCents) {
            console.log('Amount mismatch detected');

            //Create payment record
            await Payment.create({
                user_id: userId,
                subscription_id: null,
                price: 0,
                status: 'Failed',
                paid_at: new Date()
            });
            return res.status(400).json({
                success: false,
                message: `Payment amount does not match plan pricing. Expected: ${expectedAmountCents}, Got: ${paymentIntent.amount}`
            });
        }

        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();

        if (billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY) {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
            endDate.setMonth(endDate.getMonth() + 1);
        }

        const existingSubscription = await Subscription.findOne({ user_id: userId });

        let newMaxRfp = plan.maxRFPProposalGenerations;
        let newMaxGrant = plan.maxGrantProposalGenerations;

        if (existingSubscription) {
            const unusedRfp =
                (existingSubscription.max_rfp_proposal_generations -
                    existingSubscription.current_rfp_proposal_generations) || 0;
            const unusedGrant =
                (existingSubscription.max_grant_proposal_generations -
                    existingSubscription.current_grant_proposal_generations) || 0;

            newMaxRfp += unusedRfp;
            newMaxGrant += unusedGrant;
        }

        const subscription = await Subscription.findOneAndUpdate(
            { user_id: userId },
            {
                $set: {
                    plan_name: plan.name,
                    plan_price:
                        billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY
                            ? plan.yearlyPrice
                            : plan.monthlyPrice,
                    start_date: startDate,
                    end_date: endDate,
                    renewal_date: endDate,
                    max_editors: plan.maxEditors,
                    max_viewers: plan.maxViewers,
                    current_rfp_proposal_generations: 0, // reset usage
                    current_grant_proposal_generations: 0, // reset usage
                    max_rfp_proposal_generations: newMaxRfp, // ✅ directly set new total
                    max_grant_proposal_generations: newMaxGrant, // ✅ directly set new total
                    canceled_at: null,
                    auto_renewal: true,
                    stripeSubscriptionId: paymentIntent.id,
                    stripePriceId: paymentIntent.metadata.planPriceId
                }
            },
            { upsert: true, new: true }
        );

        // Update user subscription status
        await User.findByIdAndUpdate(userId, {
            subscription_status: 'active',
            subscription_id: subscription._id
        });

        // Create payment record
        await Payment.create({
            user_id: userId,
            subscription_id: subscription._id,
            price: billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice,
            status: 'Success',
            paid_at: new Date(),
            transaction_id: paymentIntentId,
            companyName: req.user.fullName,
            payment_method: 'stripe',
        });

        const notification = new Notification({
            type: "Subscription",
            title: "Subscription activated",
            description: "A subscription has been activated for " + req.user.email + " for the plan " + plan.name,
            created_at: new Date(),
        });
        await notification.save();

        const subject = `Payment Successful – ${plan.name} Plan Activated`;
        const body = `
            Hi ${req.user.fullName}, <br /><br />
            
            Your payment of ${billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice} for the ${plan.name} plan has been successfully processed. Your subscription is now active. <br /><br />

            Plan Details:
            &nbsp;&nbsp;&nbsp;&nbsp;Plan: ${plan.name}<br />
            &nbsp;&nbsp;&nbsp;&nbsp;Validity: ${startDate} to ${endDate}<br />

            <a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a> <br /><br />
            
            Best regards,<br />
            The RFP & Grants Team
        `;

        await sendEmail(req.user.email, subject, body);

        res.status(200).json({
            success: true,
            message: 'Subscription activated successfully',
            subscription: subscription
        });

    } catch (error) {
        console.error('Error activating subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate subscription',
            error: error.message
        });
    }
};

module.exports = {
    createPaymentIntent,
    activateSubscription
};
