const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Payment = require('../models/Payments');
const CompanyProfile = require('../models/CompanyProfile');
const EmployeeProfile = require('../models/EmployeeProfile');
const { sendEmail } = require('../utils/mailSender');
const emailTemplates = require('../utils/emailTemplates');

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
            try {
                // Create Stripe customer
                const customer = await stripe.customers.create({
                    email: user.email,
                    metadata: {
                        userId: userId.toString()
                    }
                });

                stripeCustomerId = customer.id;
                user.stripeCustomerId = stripeCustomerId;
                await user.save();
            } catch (stripeError) {
                console.error('Stripe customer creation failed:', stripeError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create customer account'
                });
            }
        }

        // Create payment intent with verified amount from DB
        const amountInCents = Math.round(expectedAmount * 100);

        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'usd',
                customer: stripeCustomerId,
                metadata: {
                    userId: userId.toString(),
                    planId: planId.toString(),
                    planName: plan.name,
                    billingCycle: billingCycle,
                    planPriceCents: amountInCents.toString()
                },
                automatic_payment_methods: {
                    enabled: true,
                },
                description: `${plan.name} subscription (${billingCycle})`
            });
        } catch (stripeError) {
            console.error('Stripe payment intent creation failed:', stripeError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create payment intent'
            });
        }

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create payment intent',
            error: error
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
        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['latest_charge']
            });
        } catch (stripeError) {
            console.error('Stripe payment intent retrieval failed:', stripeError);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify payment'
            });
        }

        if (paymentIntent.status !== 'succeeded') {

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

        if (paymentIntent.amount !== expectedAmountCents) {
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

        // Use transaction for data consistency with automatic refund on failure
        const session = await mongoose.startSession();
        session.startTransaction();

        let refundId = null;
        let subscription = null;

        try {
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
                        stripePriceId: paymentIntent.metadata.planPriceId || null
                    }
                },
                { upsert: true, new: true, session }
            );

            // //Check the no.of edtors and viewers from subscription and delete the extra editors and viewers from the company profile, Employee profile, amd Users Database and update the company profile
            // const companyProfile = await CompanyProfile.findById(userId);
            // const employees = companyProfile.employees;
            // let toBeDeletedEmployees = [];
            // let toBeDeletedUsers = [];
            // //Delete the extra editors and viewers from the employees
            // for (const employee of employees) {
            //     if (employee.accessLevel === "Editor" && subscription.max_editors < employees.length) {
            //         toBeDeletedEmployees.push(employee.employeeId);
            //         const employeeProfile = await EmployeeProfile.findById(employee.employeeId);
            //         toBeDeletedEmployees.push(employeeProfile.userId);
            //         toBeDeletedUsers.push(employeeProfile.userId);
            //     }
            //     if (employee.accessLevel === "Viewer" && subscription.max_viewers < employees.length) {
            //         toBeDeletedEmployees.push(employee.employeeId);
            //         const employeeProfile = await EmployeeProfile.findById(employee.employeeId);
            //         toBeDeletedEmployees.push(employeeProfile.userId);
            //         toBeDeletedUsers.push(employeeProfile.userId);
            //     }
            // }

            // //Delete the extra editors and viewers from the employee PROFILES
            // for (const employeeId of toBeDeletedEmployees) {
            //     await EmployeeProfile.findByIdAndDelete(employeeId);
            // }

            // //Delete the extra editors and viewers from the users DATABASE
            // for (const userId of toBeDeletedUsers) {
            //     await User.findByIdAndDelete(userId);
            // }

            // //Update the company profile
            // companyProfile.employees = companyProfile.employees.filter(employee => !toBeDeletedEmployees.includes(employee.employeeId));
            // await companyProfile.save({ session });

            // Update user subscription status
            await User.findByIdAndUpdate(userId, {
                subscription_status: 'active',
                subscription_id: subscription._id
            }, { session });

            // Create payment record
            await Payment.create([{
                user_id: userId,
                subscription_id: subscription._id,
                price: billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice,
                status: 'Success',
                paid_at: new Date(),
                transaction_id: paymentIntentId,
                companyName: req.user.fullName,
                payment_method: 'stripe',
            }], { session });

            await session.commitTransaction();
        } catch (error) {
            // Abort database transaction
            await session.abortTransaction();

            // Initiate automatic refund
            try {
                const refund = await stripe.refunds.create({
                    payment_intent: paymentIntentId,
                    reason: 'requested_by_customer',
                    metadata: {
                        reason: 'database_transaction_failed',
                        userId: userId,
                        planId: planId,
                        error: error.message
                    }
                });

                refundId = refund.id;
                // Create failed payment record with refund info
                await Payment.create({
                    user_id: userId,
                    subscription_id: null,
                    price: billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice,
                    status: 'Pending Refund',
                    paid_at: new Date(),
                    transaction_id: paymentIntentId,
                    refund_id: refundId,
                    companyName: req.user.fullName,
                    payment_method: 'stripe',
                    failure_reason: error.message
                });

                // Send refund notification email
                await sendRefundNotification(req.user, plan, refundId, error.message);

            } catch (refundError) {
                console.error('Failed to process refund:', refundError);

                // Create payment record indicating refund failure
                await Payment.create({
                    user_id: userId,
                    subscription_id: null,
                    price: billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice,
                    status: 'Failed - Refund Required',
                    paid_at: new Date(),
                    transaction_id: paymentIntentId,
                    companyName: req.user.fullName,
                    payment_method: 'stripe',
                    failure_reason: `Database error: ${error.message}. Refund failed: ${refundError.message}`
                });
            }

            throw error;
        } finally {
            session.endSession();
        }

        const notification = new Notification({
            type: "Subscription",
            title: "Subscription activated",
            description: "A subscription has been activated for " + req.user.email + " for the plan " + plan.name,
            created_at: new Date(),
        });
        await notification.save();

        const subject = `Payment Successful – ${plan.name} Plan Activated`;
        const amount = billingCycle === STRIPE_CONFIG.BILLING_CYCLES.YEARLY ? plan.yearlyPrice : plan.monthlyPrice;
        const body = emailTemplates.getPaymentSuccessEmail(
            req.user.fullName,
            plan.name,
            amount,
            billingCycle,
            startDate,
            endDate
        );

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
            message: error.message || 'Failed to activate subscription',
            error: error
        });
    }
};

// Helper function to send refund notification email
const sendRefundNotification = async (user, plan, refundId, errorMessage) => {
    try {
        const subject = `Payment Refunded - ${plan.name} Plan`;
        const body = emailTemplates.getRefundNotificationEmail(
            user.fullName,
            plan.name,
            refundId,
            errorMessage
        );

        await sendEmail(user.email, subject, body);
    } catch (emailError) {
        console.error('Failed to send refund notification email:', emailError);
    }
};

// Manual refund function for admin use
const processManualRefund = async (req, res) => {
    try {
        const { paymentIntentId, reason, amount } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!paymentIntentId || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: paymentIntentId, reason'
            });
        }

        // Verify payment intent exists and get details
        let paymentIntent;
        try {
            paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (stripeError) {
            console.error('Stripe payment intent retrieval failed:', stripeError);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify payment intent'
            });
        }

        if (!paymentIntent) {
            return res.status(404).json({
                success: false,
                message: 'Payment intent not found'
            });
        }

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                message: 'Payment intent was not successful, cannot refund'
            });
        }

        // Check if already refunded
        const existingRefunds = await stripe.refunds.list({
            payment_intent: paymentIntentId
        });

        if (existingRefunds.data.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment has already been refunded',
                existingRefunds: existingRefunds.data
            });
        }

        // Create refund
        const refundData = {
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer',
            metadata: {
                reason: reason,
                refundedBy: userId.toString(),
                refundedAt: new Date().toISOString()
            }
        };

        // Add amount if partial refund
        if (amount && amount > 0) {
            refundData.amount = Math.round(amount * 100); // Convert to cents
        }

        let refund;
        try {
            refund = await stripe.refunds.create(refundData);
        } catch (stripeError) {
            console.error('Stripe refund creation failed:', stripeError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create refund'
            });
        }

        // Update payment record
        await Payment.findOneAndUpdate(
            { transaction_id: paymentIntentId },
            {
                $set: {
                    status: 'Pending Refund',
                    refund_id: refund.id,
                    refunded_at: new Date(),
                    refund_reason: reason
                }
            }
        );

        // Cancel subscription if exists
        const subscription = await Subscription.findOne({
            stripeSubscriptionId: paymentIntentId
        });

        if (subscription) {
            await Subscription.findByIdAndUpdate(subscription._id, {
                $set: {
                    canceled_at: new Date(),
                    auto_renewal: false
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            refund: {
                id: refund.id,
                amount: refund.amount,
                status: refund.status,
                reason: refund.reason
            }
        });

    } catch (error) {
        console.error('Error processing manual refund:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process refund',
            error: error
        });
    }
};

// Get refund status
const getRefundStatus = async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        if (!paymentIntentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment intent ID is required'
            });
        }

        // Get refunds for this payment intent
        let refunds;
        try {
            refunds = await stripe.refunds.list({
                payment_intent: paymentIntentId
            });
        } catch (stripeError) {
            console.error('Stripe refunds list failed:', stripeError);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve refund information'
            });
        }

        // Get payment record
        const payment = await Payment.findOne({ transaction_id: paymentIntentId });

        res.status(200).json({
            success: true,
            paymentIntentId: paymentIntentId,
            refunds: refunds.data,
            paymentRecord: payment
        });

    } catch (error) {
        console.error('Error getting refund status:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get refund status',
            error: error
        });
    }
};

module.exports = {
    createPaymentIntent,
    activateSubscription,
    processManualRefund,
    getRefundStatus
};
