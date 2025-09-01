const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');
const Payment = require('../models/Payments');

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
        const userId = req.user.id;

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
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(expectedAmount * 100), // Convert to cents
            currency: 'usd',
            customer: stripeCustomerId,
            metadata: {
                userId: userId,
                planId: planId,
                planName: plan.name,
                billingCycle: billingCycle,
                planPriceCents: Math.round(expectedAmount * 100).toString()
            },
            automatic_payment_methods: {
                enabled: true,
            },
            description: `${plan.name} subscription (${billingCycle})`
        });

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
        const userId = req.user.id;

        // Validate required fields
        if (!paymentIntentId || !planId || !billingCycle) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: paymentIntentId, planId, billingCycle'
            });
        }

        // Verify payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            console.log('Payment not completed. Payment intent status:', paymentIntent.status);
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
                message: 'Payment not completed'
            });
        }

        // Verify the payment intent belongs to this user
        if (paymentIntent.metadata.userId !== userId) {
            console.log('Unauthorized access to payment intent. Payment intent user id:', paymentIntent.metadata.userId);
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
            console.log('Plan not found. Payment intent plan id:', paymentIntent.metadata.planId);
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
            console.log('Payment intent metadata mismatch. Payment intent plan id:', paymentIntent.metadata.planId);
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

        const expectedAmountCents = Math.round((billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice) * 100);
        if (paymentIntent.amount !== expectedAmountCents) {
            console.log('Payment amount does not match plan pricing. Payment intent amount:', paymentIntent.amount);
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
                message: 'Payment amount does not match plan pricing'
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

        // Create or update subscription
        const subscription = await Subscription.findOneAndUpdate(
            { user_id: userId },
            {
                plan_name: plan.name,
                plan_price: billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice,
                start_date: startDate,
                end_date: endDate,
                renewal_date: endDate,
                max_editors: plan.maxEditors,
                max_viewers: plan.maxViewers,
                max_rfp_proposal_generations: plan.maxRFPProposalGenerations,
                max_grant_proposal_generations: plan.maxGrantProposalGenerations,
                canceled_at: null,
                auto_renewal: true
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
            paid_at: new Date()
        });

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

// Stripe Webhook Handler
const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;
            case 'checkout.session.completed': {
                const session = event.data.object;
                if (session.mode === 'subscription') {
                    await handleCheckoutSessionCompleted(session);
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                await handleStripeSubscriptionEvent(sub, event.type);
                break;
            }
            case 'invoice.payment_succeeded':
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                await handleInvoiceEvent(invoice, event.type);
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

// Webhook Event Handlers
const handlePaymentIntentSucceeded = async (paymentIntent) => {
    console.log('Payment succeeded:', paymentIntent.id);
    // Additional logic for successful payments can be added here
};

const handlePaymentIntentFailed = async (paymentIntent) => {
    console.log('Payment failed:', paymentIntent.id);
    // Handle failed payment logic
};

// Handle Stripe Checkout Session completion (Subscriptions)
const handleCheckoutSessionCompleted = async (session) => {
    try {
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const billingCycle = session.metadata?.billingCycle;
        const subscriptionId = session.subscription; // Stripe subscription id

        if (!userId || !planId || !billingCycle || !subscriptionId) return;

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) return;

        // Fetch the Stripe subscription to get price id and current period end
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        const item = stripeSub.items?.data?.[0];
        const priceId = item?.price?.id || null;

        const startDate = new Date(stripeSub.current_period_start * 1000);
        const endDate = new Date(stripeSub.current_period_end * 1000);

        const subscription = await Subscription.findOneAndUpdate(
            { user_id: userId },
            {
                plan_name: plan.name,
                plan_price: billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice,
                start_date: startDate,
                end_date: endDate,
                renewal_date: endDate,
                max_editors: plan.maxEditors,
                max_viewers: plan.maxViewers,
                max_rfp_proposal_generations: plan.maxRFPProposalGenerations,
                max_grant_proposal_generations: plan.maxGrantProposalGenerations,
                canceled_at: null,
                auto_renewal: true,
                stripeSubscriptionId: stripeSub.id,
                stripePriceId: priceId
            },
            { upsert: true, new: true }
        );

        await User.findByIdAndUpdate(userId, {
            subscription_status: 'active',
            subscription_id: subscription._id
        });
    } catch (err) {
        console.error('Failed to handle checkout.session.completed', err);
    }
};

// Handle Stripe subscription lifecycle events
const handleStripeSubscriptionEvent = async (stripeSub, eventType) => {
    try {
        const userId = stripeSub.metadata?.userId;
        if (!userId) return;

        const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
        const canceledAt = stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null;

        await Subscription.findOneAndUpdate(
            { user_id: userId },
            {
                stripeSubscriptionId: stripeSub.id,
                renewal_date: currentPeriodEnd,
                end_date: currentPeriodEnd,
                canceled_at: canceledAt,
                auto_renewal: !stripeSub.cancel_at_period_end
            },
            { new: true }
        );

        if (eventType === 'customer.subscription.deleted') {
            await User.findByIdAndUpdate(userId, { subscription_status: 'inactive' });
        }
    } catch (err) {
        console.error('Failed to handle subscription event', err);
    }
};

// Handle invoice events to record payments
const handleInvoiceEvent = async (invoice, eventType) => {
    try {
        const userId = invoice.metadata?.userId;
        if (!userId) return;
        const subscription = await Subscription.findOne({ user_id: userId });
        if (!subscription) return;

        if (eventType === 'invoice.payment_succeeded') {
            await Payment.create({
                user_id: userId,
                subscription_id: subscription._id,
                price: (invoice.amount_paid || 0) / 100,
                currency: invoice.currency?.toUpperCase() || 'USD',
                payment_method: 'stripe',
                transaction_id: invoice.payment_intent || invoice.id,
                status: 'Success',
                paid_at: new Date(invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : Date.now())
            });
        } else if (eventType === 'invoice.payment_failed') {
            await Payment.create({
                user_id: userId,
                subscription_id: subscription._id,
                price: (invoice.amount_due || 0) / 100,
                currency: invoice.currency?.toUpperCase() || 'USD',
                payment_method: 'stripe',
                transaction_id: invoice.payment_intent || invoice.id,
                status: 'Failed'
            });
        }
    } catch (err) {
        console.error('Failed to handle invoice event', err);
    }
};

module.exports = {
    createPaymentIntent,
    activateSubscription,
    handleCheckoutSessionCompleted,
    handleStripeSubscriptionEvent,
    handleInvoiceEvent,
    handlePaymentIntentSucceeded,
    handlePaymentIntentFailed,
    handleWebhook
};
