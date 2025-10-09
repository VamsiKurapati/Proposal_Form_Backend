const axios = require('axios');

// Simple in-memory cache for IP lookups
// Format: { "IP_ADDRESS": { locationInfo: "City, Region, Country", timestamp: 1690000000000 } }
const ipCache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getLocationFromIP(ipAddress) {
    if (!ipAddress) return 'Unknown Location';

    const now = Date.now();
    const cached = ipCache[ipAddress];

    // ✅ If cached and still valid, return it
    if (cached && now - cached.timestamp < CACHE_TTL) {
        return cached.locationInfo;
    }

    try {
        const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
        const data = response.data;

        let locationInfo = 'Unknown Location';
        if (data && data.city && data.region && data.country_name) {
            locationInfo = `${data.city}, ${data.region}, ${data.country_name}`;
        }

        // ✅ Cache the result
        ipCache[ipAddress] = { locationInfo, timestamp: now };
        return locationInfo;
    } catch (err) {
        console.error('Error fetching IP location:', err.message);
        return 'Unknown Location';
    }
}

/**
 * Modern Email Templates for RFP2GRANTS
 * Featuring responsive design, modern styling, and professional branding
 */

// Base email template with modern styling
const getBaseTemplate = (content, preheader = '') => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        ${preheader ? `<meta name="x-apple-disable-message-reformatting">
        <style type="text/css">
            #outlook a { padding: 0; }
            .ReadMsgBody { width: 100%; }
            .ExternalClass { width: 100%; }
        </style>` : ''}
        <title>RFP2GRANTS</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1e293b;
                background-color: #f8fafc;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            
            .email-wrapper {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
            }
            
            .email-header {
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                padding: 40px 30px;
                text-align: center;
            }
            
            .email-logo {
                font-size: 28px;
                font-weight: 700;
                color: #ffffff;
                text-decoration: none;
                letter-spacing: -0.5px;
            }
            
            .email-content {
                padding: 40px 30px;
                background-color: #ffffff;
            }
            
            .greeting {
                font-size: 24px;
                font-weight: 600;
                color: #0f172a;
                margin-bottom: 20px;
            }
            
            .message {
                font-size: 16px;
                color: #475569;
                line-height: 1.8;
                margin-bottom: 20px;
            }
            
            .highlight-box {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border-left: 4px solid #2563eb;
                padding: 20px;
                margin: 30px 0;
                border-radius: 8px;
            }
            
            .highlight-box strong {
                color: #1e40af;
                font-weight: 600;
            }
            
            .info-item {
                padding: 10px 0;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .info-item:last-child {
                border-bottom: none;
            }
            
            .info-label {
                color: #64748b;
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 4px;
            }
            
            .info-value {
                color: #0f172a;
                font-size: 16px;
                font-weight: 600;
            }
            
            .btn {
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                transition: transform 0.2s;
                box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
            }
            
            .btn-secondary {
                background: linear-gradient(135deg, #64748b 0%, #475569 100%);
                box-shadow: 0 4px 6px -1px rgba(100, 116, 139, 0.3);
            }
            
            .otp-code {
                font-size: 32px;
                font-weight: 700;
                color: #2563eb;
                letter-spacing: 8px;
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border-radius: 12px;
                margin: 30px 0;
                border: 2px dashed #2563eb;
            }
            
            .divider {
                height: 1px;
                background: linear-gradient(to right, transparent, #e2e8f0, transparent);
                margin: 30px 0;
            }
            
            .warning-box {
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border-left: 4px solid #dc2626;
                padding: 16px;
                margin: 20px 0;
                border-radius: 8px;
            }
            
            .warning-box p {
                color: #991b1b;
                font-size: 14px;
                margin: 0;
            }
            
            .success-box {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border-left: 4px solid #16a34a;
                padding: 20px;
                margin: 20px 0;
                border-radius: 8px;
            }
            
            .success-box p {
                color: #166534;
                font-size: 16px;
                margin: 0;
            }
            
            .email-footer {
                background-color: #0f172a;
                padding: 30px;
                text-align: center;
            }
            
            .footer-text {
                color: #94a3b8;
                font-size: 14px;
                margin-bottom: 16px;
            }
            
            .footer-links {
                margin: 20px 0;
            }
            
            .footer-link {
                color: #cbd5e1;
                text-decoration: none;
                margin: 0 12px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .footer-link:hover {
                color: #ffffff;
            }
            
            .social-links {
                margin-top: 20px;
            }
            
            .social-link {
                display: inline-block;
                width: 36px;
                height: 36px;
                margin: 0 8px;
                background-color: #1e293b;
                border-radius: 50%;
                line-height: 36px;
                color: #cbd5e1;
                text-decoration: none;
            }
            
            @media only screen and (max-width: 600px) {
                .email-content {
                    padding: 30px 20px;
                }
                
                .email-header {
                    padding: 30px 20px;
                }
                
                .greeting {
                    font-size: 20px;
                }
                
                .message {
                    font-size: 15px;
                }
                
                .btn {
                    display: block;
                    text-align: center;
                    padding: 12px 24px;
                }
                
                .otp-code {
                    font-size: 28px;
                    letter-spacing: 6px;
                }
            }
        </style>
    </head>
    <body>
        ${preheader ? `
        <div style="display: none; max-height: 0px; overflow: hidden;">
            ${preheader}
        </div>
        ` : ''}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; padding: 20px 0;">
            <tr>
                <td align="center">
                    <div class="email-wrapper">
                        <!-- Header -->
                        <div class="email-header">
                            <div class="email-logo">RFP2GRANTS</div>
                        </div>
                        
                        <!-- Content -->
                        <div class="email-content">
                            ${content}
                        </div>
                        
                        <!-- Footer -->
                        <div class="email-footer">
                            <p class="footer-text">
                                © ${new Date().getFullYear()} RFP2GRANTS. All rights reserved.
                            </p>
                            <div class="footer-links">
                                <a href="${process.env.FRONTEND_URL}" class="footer-link">Home</a>
                                <a href="${process.env.FRONTEND_URL}/contact" class="footer-link">Contact Us</a>
                                <a href="${process.env.FRONTEND_URL}/privacy" class="footer-link">Privacy Policy</a>
                            </div>
                            <p class="footer-text" style="margin-top: 20px;">
                                Need help? Contact us at <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color: #60a5fa; text-decoration: none;">${process.env.SUPPORT_EMAIL}</a>
                            </p>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

// Welcome Email Template
exports.getWelcomeEmail = (fullName) => {
    const content = `
        <div class="greeting">Welcome to RFP2GRANTS! 🎉</div>
        <p class="message">
            Hi <strong>${fullName}</strong>,
        </p>
        <div class="success-box">
            <p>
                🎊 Your account has been successfully created! We're thrilled to have you join our community.
            </p>
        </div>
        <p class="message">
            You're now part of a powerful platform designed to streamline your RFP and grant proposal process. 
            Get started by logging in and exploring all the features we have to offer.
        </p>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/login" class="btn">
                Login to Your Account →
            </a>
        </div>
        <div class="divider"></div>
        <div class="highlight-box">
            <p style="margin: 0; color: #1e40af; font-weight: 600;">✨ Quick Start Tips:</p>
            <ul style="margin: 12px 0 0 20px; color: #475569;">
                <li style="margin: 8px 0;">Complete your company profile for better proposal matching</li>
                <li style="margin: 8px 0;">Upload relevant documents to enhance AI-generated proposals</li>
                <li style="margin: 8px 0;">Explore your dashboard to discover active RFPs and grants</li>
            </ul>
        </div>
        <p class="message">
            If you have any questions, our support team is always here to help!
        </p>
    `;

    return getBaseTemplate(content, 'Welcome to RFP2GRANTS - Your account is ready!');
};

exports.getLoginAlertEmail = async (fullName, ipAddress) => {
    const locationInfo = await getLocationFromIP(ipAddress);

    // Get current time & timezone
    const date = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formattedTime = date.toLocaleString('en-US', { timeZone });

    const content = `
        <div class="greeting">New Sign-In Detected 🔐</div>
        <p class="message">
            Hi <strong>${fullName}</strong>,
        </p>
        <p class="message">
            We detected a sign-in to your account from a new device or location. 
            If this was you, no action is required.
        </p>
        <div class="highlight-box">
            <div class="info-item">
                <div class="info-label">Sign-in Time</div>
                <div class="info-value">${formattedTime} (${timeZone})</div>
            </div>
            <div class="info-item">
                <div class="info-label">IP Address</div>
                <div class="info-value">${ipAddress || 'Unknown'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Location</div>
                <div class="info-value">${locationInfo}</div>
            </div>
        </div>
        <div class="warning-box">
            <p>
                ⚠️ <strong>Didn't sign in?</strong> Secure your account immediately by changing your password.
            </p>
        </div>
        <div style="text-align: center; gap: 10px;">
            <a href="${process.env.FRONTEND_URL}/forgot-password" class="btn">
                Secure My Account
            </a>
            <a href="${process.env.FRONTEND_URL}/login" class="btn btn-secondary">
                Login to Your Account
            </a>
        </div>
    `;

    return getBaseTemplate(content, 'New sign-in detected on your account');
};

// OTP Email Template
exports.getOTPEmail = (fullName, otp, purpose = 'password reset') => {
    const content = `
        <div class="greeting">Verification Code</div>
        <p class="message">
            Hi <strong>${fullName}</strong>,
        </p>
        <p class="message">
            You requested a verification code for ${purpose}. Use the code below to proceed:
        </p>
        <div class="otp-code">
            ${otp}
        </div>
        <p class="message" style="text-align: center; color: #64748b; font-size: 14px;">
            This code will expire in <strong style="color: #dc2626;">10 minutes</strong>
        </p>
        <div class="divider"></div>
        <div class="warning-box">
            <p>
                🛡️ <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your verification code.
            </p>
        </div>
        <p class="message">
            If you didn't request this code, you can safely ignore this email.
        </p>
    `;

    return getBaseTemplate(content, `Your verification code: ${otp}`);
};

// Password Reset Success Email Template
exports.getPasswordResetSuccessEmail = (fullName) => {
    const content = `
        <div class="greeting">Password Updated Successfully ✓</div>
        <p class="message">
            Hi <strong>${fullName}</strong>,
        </p>
        <div class="success-box">
            <p>
                ✅ Your password has been successfully changed. Your account is now secured with your new password.
            </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/login" class="btn">
                Login with New Password
            </a>
        </div>
        <div class="divider"></div>
        <div class="warning-box">
            <p>
                ⚠️ <strong>Didn't make this change?</strong> Reset your password immediately and contact our support team.
            </p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}/forgot-password" class="btn btn-secondary">
                Reset Password Again
            </a>
        </div>
    `;

    return getBaseTemplate(content, 'Your password has been successfully updated');
};

// Email Verification Code Template
exports.getEmailVerificationEmail = (verificationCode) => {
    const content = `
        <div class="greeting">Verify Your Email Address</div>
        <p class="message">
            Hello!
        </p>
        <p class="message">
            Thank you for signing up with RFP2GRANTS. To complete your registration, please verify your email address using the code below:
        </p>
        <div class="otp-code">
            ${verificationCode}
        </div>
        <p class="message" style="text-align: center; color: #64748b; font-size: 14px;">
            This code will expire in <strong style="color: #dc2626;">10 minutes</strong>
        </p>
        <div class="divider"></div>
        <p class="message">
            Once verified, you'll be able to complete your profile setup and start using the platform.
        </p>
        <div class="warning-box">
            <p>
                If you didn't create an account with RFP2GRANTS, you can safely ignore this email.
            </p>
        </div>
    `;

    return getBaseTemplate(content, `Verify your email - Code: ${verificationCode}`);
};

// Employee Welcome Email Template
exports.getEmployeeWelcomeEmail = (name, email, password, companyName) => {
    const content = `
        <div class="greeting">Welcome to ${companyName}! 👋</div>
        <p class="message">
            Hi <strong>${name}</strong>,
        </p>
        <p class="message">
            An account has been created for you to collaborate on ${companyName}'s RFP2GRANTS workspace. 
            Use the credentials below to get started:
        </p>
        <div class="highlight-box">
            <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${email}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Temporary Password</div>
                <div class="info-value" style="font-family: 'Courier New', monospace; background: #f1f5f9; padding: 8px; border-radius: 4px; display: inline-block;">${password}</div>
            </div>
        </div>
        <div class="warning-box">
            <p>
                🔒 <strong>Important:</strong> Please change your password after your first login for security purposes.
            </p>
        </div>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/login" class="btn">
                Login Now →
            </a>
            <a href="${process.env.FRONTEND_URL}/forgot-password" class="btn btn-secondary">
                Reset Password
            </a>
        </div>
    `;

    return getBaseTemplate(content, `Welcome to ${companyName} on RFP2GRANTS`);
};

// Payment Success Email Template
exports.getPaymentSuccessEmail = (fullName, planName, amount, billingCycle, startDate, endDate) => {
    const content = `
        <div class="greeting">Payment Successful! 🎉</div>
        <p class="message">
            Hi <strong>${fullName}</strong>,
        </p>
        <div class="success-box">
            <p>
                ✅ Your payment has been successfully processed. Your <strong>${planName}</strong> subscription is now active!
            </p>
        </div>
        <div class="highlight-box">
            <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600; font-size: 18px;">📋 Subscription Details</p>
            <div class="info-item">
                <div class="info-label">Plan</div>
                <div class="info-value">${planName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Amount Paid</div>
                <div class="info-value" style="color: #16a34a;">$${amount.toFixed(2)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Billing Cycle</div>
                <div class="info-value">${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Subscription Period</div>
                <div class="info-value">${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</div>
            </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">
                Go to Dashboard →
            </a>
        </div>
        <p class="message">
            Start exploring all the premium features available with your new subscription!
        </p>
    `;

    return getBaseTemplate(content, `Payment Successful - ${planName} Plan Activated`);
};

// Refund Notification Email Template
exports.getRefundNotificationEmail = (fullName, planName, refundId, errorMessage) => {
    const content = `
        <div class="greeting">Payment Refunded</div>
        <p class="message">
            Hi <strong>${fullName}</strong>,
        </p>
        <p class="message">
            We encountered a technical issue while processing your subscription for the <strong>${planName}</strong> plan. 
            As a result, we have automatically refunded your payment.
        </p>
        <div class="highlight-box">
            <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600; font-size: 18px;">💳 Refund Details</p>
            <div class="info-item">
                <div class="info-label">Plan</div>
                <div class="info-value">${planName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Refund ID</div>
                <div class="info-value" style="font-family: 'Courier New', monospace; font-size: 14px;">${refundId}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value" style="color: #dc2626;">Refunded to original payment method</div>
            </div>
        </div>
        <div class="warning-box">
            <p>
                <strong>What happened?</strong><br>
                ${errorMessage}
            </p>
        </div>
        <p class="message">
            <strong>Next Steps:</strong>
        </p>
        <ul style="margin: 12px 0 0 20px; color: #475569;">
            <li style="margin: 8px 0;">Your refund will appear in your account within 5-10 business days</li>
            <li style="margin: 8px 0;">You can try subscribing again once the issue is resolved</li>
            <li style="margin: 8px 0;">Contact our support team if you have any questions</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/contact" class="btn">
                Contact Support
            </a>
        </div>
        <p class="message">
            We apologize for any inconvenience caused.
        </p>
    `;

    return getBaseTemplate(content, `Payment Refunded - ${planName} Plan`);
};

// Password Changed Notification Template
exports.getPasswordChangedEmail = (fullName) => {
    const content = `
        <div class="greeting">Password Changed Successfully</div>
        <p class="message">
            Hi <strong>${fullName}</strong>,
        </p>
        <div class="success-box">
            <p>
                ✅ Your account password has been successfully changed at ${new Date().toLocaleString()}.
            </p>
        </div>
        <div class="warning-box">
            <p>
                ⚠️ <strong>Didn't make this change?</strong><br>
                If you did not authorize this password change, please reset your password immediately and contact our support team.
            </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/forgot-password" class="btn">
                Reset Password
            </a>
        </div>
        <div class="divider"></div>
        <p class="message">
            For your security, we recommend:
        </p>
        <ul style="margin: 12px 0 0 20px; color: #475569;">
            <li style="margin: 8px 0;">Using a unique password for your RFP2GRANTS account</li>
            <li style="margin: 8px 0;">Enabling two-factor authentication when available</li>
            <li style="margin: 8px 0;">Never sharing your password with anyone</li>
        </ul>
    `;

    return getBaseTemplate(content, 'Your password has been changed');
};

// Enterprise Plan Email Template
exports.getEnterprisePlanEmail = (fullName, email, price, planType, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations, checkoutUrl) => {
    const content = `
        <div class="greeting">Your Enterprise Plan is Ready! 🚀</div>
        <p class="message">
            Hello <strong>${fullName}</strong>,
        </p>
        <p class="message">
            Your custom enterprise plan has been created with features tailored specifically for your organization. 
            Review the details below and complete your payment to activate your subscription.
        </p>
        <div class="highlight-box">
            <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600; font-size: 18px;">📦 Plan Details</p>
            <div class="info-item">
                <div class="info-label">Price</div>
                <div class="info-value" style="color: #16a34a;">$${price}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Plan Type</div>
                <div class="info-value">${planType}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Max Editors</div>
                <div class="info-value">${maxEditors}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Max Viewers</div>
                <div class="info-value">${maxViewers}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Max RFP Proposal Generations</div>
                <div class="info-value">${maxRFPProposalGenerations}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Max Grant Proposal Generations</div>
                <div class="info-value">${maxGrantProposalGenerations}</div>
            </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${checkoutUrl}" class="btn">
                Complete Payment Securely →
            </a>
        </div>
        <p class="message" style="text-align: center; color: #64748b; font-size: 14px;">
            🔒 All payments are processed securely through Stripe
        </p>
    `;

    return getBaseTemplate(content, `Your Enterprise Plan Payment Link - RFP2GRANTS`);
};

// Enterprise Payment Success Template
exports.getEnterprisePaymentSuccessEmail = (fullName, planType, price, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations) => {
    const content = `
        <div class="greeting">Enterprise Plan Activated! 🎉</div>
        <p class="message">
            Hello <strong>${fullName}</strong>,
        </p>
        <div class="success-box">
            <p>
                🎊 Your payment for the custom Enterprise Plan was successful! Your account has been upgraded with all premium features.
            </p>
        </div>
        <div class="highlight-box">
            <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600; font-size: 18px;">📦 Your Active Plan</p>
            <div class="info-item">
                <div class="info-label">Plan Type</div>
                <div class="info-value">${planType}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Price</div>
                <div class="info-value" style="color: #16a34a;">$${price}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Max Editors</div>
                <div class="info-value">${maxEditors} team members</div>
            </div>
            <div class="info-item">
                <div class="info-label">Max Viewers</div>
                <div class="info-value">${maxViewers} team members</div>
            </div>
            <div class="info-item">
                <div class="info-label">RFP Proposal Generations</div>
                <div class="info-value">${maxRFPProposalGenerations} per cycle</div>
            </div>
            <div class="info-item">
                <div class="info-label">Grant Proposal Generations</div>
                <div class="info-value">${maxGrantProposalGenerations} per cycle</div>
            </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="btn">
                Access Your Dashboard →
            </a>
        </div>
        <p class="message">
            Thank you for choosing RFP2GRANTS Enterprise. Our team is here to support your success!
        </p>
    `;

    return getBaseTemplate(content, 'Enterprise Plan Payment Successful');
};

// Enterprise Payment Failed Template
exports.getEnterprisePaymentFailedEmail = (fullName) => {
    const content = `
        <div class="greeting">Payment Issue Detected</div>
        <p class="message">
            Hello <strong>${fullName}</strong>,
        </p>
        <p class="message">
            We were unable to process your payment for the custom Enterprise Plan. This can happen for several reasons:
        </p>
        <ul style="margin: 12px 0 0 20px; color: #475569;">
            <li style="margin: 8px 0;">Insufficient funds in your account</li>
            <li style="margin: 8px 0;">Payment method declined by your bank</li>
            <li style="margin: 8px 0;">Network connectivity issues during checkout</li>
            <li style="margin: 8px 0;">Payment details entered incorrectly</li>
        </ul>
        <div class="warning-box">
            <p>
                Don't worry! You can try again or contact our support team for assistance.
            </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/pricing" class="btn">
                Try Again
            </a>
            <a href="${process.env.FRONTEND_URL}/contact" class="btn btn-secondary">
                Contact Support
            </a>
        </div>
    `;

    return getBaseTemplate(content, 'Enterprise Plan Payment Failed');
};

