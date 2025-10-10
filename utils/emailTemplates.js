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

// Base email template with Outlook-compatible styling
const getBaseTemplate = (content, preheader = '') => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="x-apple-disable-message-reformatting">
        <!--[if mso]>
        <style type="text/css">
            table { border-collapse: collapse; }
            .btn { padding: 12px 30px !important; }
        </style>
        <![endif]-->
        <title>RFP2GRANTS</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: Arial, Helvetica, sans-serif;
                line-height: 1.6;
                color: #1e293b;
                background-color: #f8fafc;
            }
            table {
                border-spacing: 0;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
            td {
                padding: 0;
            }
            img {
                border: 0;
                display: block;
                outline: none;
                text-decoration: none;
            }
            a {
                text-decoration: none;
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f8fafc;">
        ${preheader ? `
        <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
            ${preheader}
        </div>
        ` : ''}
        
        <!-- Outer Table -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
            <tr>
                <td style="padding: 20px 0;">
                    <!-- Main Wrapper Table -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width: 600px; background-color: #ffffff;">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background-color: #2563eb; padding: 40px 30px; text-align: center;">
                                <!--[if mso]>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr><td align="center">
                                <![endif]-->
                                <span style="font-size: 28px; font-weight: 700; color: #ffffff; font-family: Arial, Helvetica, sans-serif; display: inline-block;">RFP2GRANTS</span>
                                <!--[if mso]>
                                </td></tr>
                                </table>
                                <![endif]-->
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px; background-color: #ffffff;">
                            ${content}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #0f172a; padding: 30px; text-align: center;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="text-align: center; padding-bottom: 16px;">
                                            <p style="color: #94a3b8; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                                © ${new Date().getFullYear()} RFP2GRANTS. All rights reserved.
                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center; padding: 20px 0;">
                                            <a href="${process.env.FRONTEND_URL}" style="color: #cbd5e1; text-decoration: none; margin: 0 12px; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Home</a>
                                            <span style="color: #475569; margin: 0 4px;">|</span>
                                            <a href="${process.env.FRONTEND_URL}/contact" style="color: #cbd5e1; text-decoration: none; margin: 0 12px; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Contact Us</a>
                                            <span style="color: #475569; margin: 0 4px;">|</span>
                                            <a href="${process.env.FRONTEND_URL}/privacy" style="color: #cbd5e1; text-decoration: none; margin: 0 12px; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Privacy Policy</a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center; padding-top: 20px;">
                                            <p style="color: #94a3b8; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                                Need help? Contact us at <a href="mailto:${process.env.SUPPORT_EMAIL}" style="color: #60a5fa; text-decoration: none;">${process.env.SUPPORT_EMAIL}</a>
                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                    </table>
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Welcome to RFP2GRANTS! 🎉</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Hi <strong>${fullName}</strong>,
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #f0fdf4; border-left: 4px solid #16a34a; margin: 20px 0;">
                    <p style="color: #166534; font-size: 16px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                🎊 Your account has been successfully created! We're thrilled to have you join our community.
            </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px 0;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            You're now part of a powerful platform designed to streamline your RFP and grant proposal process. 
            Get started by logging in and exploring all the features we have to offer.
        </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/login" style="height:48px;v-text-anchor:middle;width:250px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Login to Your Account →</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Login to Your Account →</a>
                    <!--<![endif]-->
                </td>
            </tr>
            <tr>
                <td style="padding: 30px 0;">
                    <div style="height: 1px; background-color: #e2e8f0;"></div>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #eff6ff; border-left: 4px solid #2563eb;">
                    <p style="margin: 0 0 12px 0; color: #1e40af; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">✨ Quick Start Tips:</p>
                    <ul style="margin: 12px 0 0 20px; color: #475569; font-family: Arial, Helvetica, sans-serif;">
                <li style="margin: 8px 0;">Complete your company profile for better proposal matching</li>
                <li style="margin: 8px 0;">Upload relevant documents to enhance AI-generated proposals</li>
                <li style="margin: 8px 0;">Explore your dashboard to discover active RFPs and grants</li>
            </ul>
                </td>
            </tr>
            <tr>
                <td style="padding-top: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            If you have any questions, our support team is always here to help!
        </p>
                </td>
            </tr>
        </table>
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">New Sign-In Detected 🔐</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">
            Hi <strong>${fullName}</strong>,
        </p>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            We detected a sign-in to your account from a new device or location. 
            If this was you, no action is required.
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #eff6ff; border-left: 4px solid #2563eb;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Sign-in Time</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${formattedTime} (${timeZone})</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">IP Address</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${ipAddress || 'Unknown'}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Location</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${locationInfo}</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; margin: 20px 0;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                ⚠️ <strong>Didn't sign in?</strong> Secure your account immediately by changing your password.
            </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td style="padding-bottom: 10px;">
                                <!--[if mso]>
                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/forgot-password" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Secure My Account</center>
                                </v:roundrect>
                                <![endif]-->
                                <!--[if !mso]><!-->
                                <a href="${process.env.FRONTEND_URL}/forgot-password" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Secure My Account</a>
                                <!--<![endif]-->
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <!--[if mso]>
                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/login" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="#64748b" fillcolor="#64748b">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Login to Your Account</center>
                                </v:roundrect>
                                <![endif]-->
                                <!--[if !mso]><!-->
                                <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 14px 32px; background-color: #64748b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Login to Your Account</a>
                                <!--<![endif]-->
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, 'New sign-in detected on your account');
};

// OTP Email Template
exports.getOTPEmail = (fullName, otp, purpose = 'password reset') => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Verification Code</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">
            Hi <strong>${fullName}</strong>,
        </p>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            You requested a verification code for ${purpose}. Use the code below to proceed:
        </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px; background-color: #eff6ff; border: 2px dashed #2563eb; margin: 30px 0;">
                    <div style="font-size: 32px; font-weight: 700; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</div>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <p style="text-align: center; color: #64748b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            This code will expire in <strong style="color: #dc2626;">10 minutes</strong>
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px 0;">
                    <div style="height: 1px; background-color: #e2e8f0;"></div>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                🛡️ <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your verification code.
            </p>
                </td>
            </tr>
            <tr>
                <td style="padding-top: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            If you didn't request this code, you can safely ignore this email.
        </p>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, `Your verification code: ${otp}`);
};

// Password Reset Success Email Template
exports.getPasswordResetSuccessEmail = (fullName) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Password Updated Successfully ✓</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Hi <strong>${fullName}</strong>,
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #f0fdf4; border-left: 4px solid #16a34a;">
                    <p style="color: #166534; font-size: 16px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                ✅ Your password has been successfully changed. Your account is now secured with your new password.
            </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 30px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/login" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Login with New Password</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Login with New Password</a>
                    <!--<![endif]-->
                </td>
            </tr>
            <tr>
                <td style="padding: 30px 0;">
                    <div style="height: 1px; background-color: #e2e8f0;"></div>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                ⚠️ <strong>Didn't make this change?</strong> Reset your password immediately and contact our support team.
            </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/forgot-password" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="#64748b" fillcolor="#64748b">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Reset Password Again</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${process.env.FRONTEND_URL}/forgot-password" style="display: inline-block; padding: 14px 32px; background-color: #64748b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Reset Password Again</a>
                    <!--<![endif]-->
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, 'Your password has been successfully updated');
};

// Email Verification Code Template
exports.getEmailVerificationEmail = (verificationCode) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Verify Your Email Address</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">
            Hello!
        </p>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Thank you for signing up with RFP2GRANTS. To complete your registration, please verify your email address using the code below:
        </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px; background-color: #eff6ff; border: 2px dashed #2563eb; margin: 30px 0;">
                    <div style="font-size: 32px; font-weight: 700; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">${verificationCode}</div>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <p style="text-align: center; color: #64748b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            This code will expire in <strong style="color: #dc2626;">10 minutes</strong>
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px 0;">
                    <div style="height: 1px; background-color: #e2e8f0;"></div>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Once verified, you'll be able to complete your profile setup and start using the platform.
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                If you didn't create an account with RFP2GRANTS, you can safely ignore this email.
            </p>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, `Verify your email - Code: ${verificationCode}`);
};

// Employee Welcome Email Template
exports.getEmployeeWelcomeEmail = (name, email, password, companyName) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Welcome to ${companyName}! 👋</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">
            Hi <strong>${name}</strong>,
        </p>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            An account has been created for you to collaborate on ${companyName}'s RFP2GRANTS workspace. 
            Use the credentials below to get started:
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #eff6ff; border-left: 4px solid #2563eb;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Email</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${email}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Temporary Password</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace; background-color: #f1f5f9; padding: 8px; display: inline-block;">${password}</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; margin: 20px 0;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                🔒 <strong>Important:</strong> Please change your password after your first login for security purposes.
            </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td style="padding-bottom: 10px;">
                                <!--[if mso]>
                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/login" style="height:48px;v-text-anchor:middle;width:180px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Login Now →</center>
                                </v:roundrect>
                                <![endif]-->
                                <!--[if !mso]><!-->
                                <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Login Now →</a>
                                <!--<![endif]-->
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <!--[if mso]>
                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/forgot-password" style="height:48px;v-text-anchor:middle;width:180px;" arcsize="17%" strokecolor="#64748b" fillcolor="#64748b">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Reset Password</center>
                                </v:roundrect>
                                <![endif]-->
                                <!--[if !mso]><!-->
                                <a href="${process.env.FRONTEND_URL}/forgot-password" style="display: inline-block; padding: 14px 32px; background-color: #64748b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Reset Password</a>
                                <!--<![endif]-->
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, `Welcome to ${companyName} on RFP2GRANTS`);
};

// Payment Success Email Template
exports.getPaymentSuccessEmail = (fullName, planName, amount, billingCycle, startDate, endDate) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Payment Successful! 🎉</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Hi <strong>${fullName}</strong>,
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #f0fdf4; border-left: 4px solid #16a34a;">
                    <p style="color: #166534; font-size: 16px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                ✅ Your payment has been successfully processed. Your <strong>${planName}</strong> subscription is now active!
            </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #eff6ff; border-left: 4px solid #2563eb; margin: 20px 0;">
                    <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600; font-size: 18px; font-family: Arial, Helvetica, sans-serif;">📋 Subscription Details</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Plan</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${planName}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Amount Paid</div>
                                <div style="color: #16a34a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">$${amount.toFixed(2)}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Billing Cycle</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Subscription Period</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 30px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/dashboard" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Go to Dashboard →</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Go to Dashboard →</a>
                    <!--<![endif]-->
                </td>
            </tr>
            <tr>
                <td>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Start exploring all the premium features available with your new subscription!
        </p>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, `Payment Successful - ${planName} Plan Activated`);
};

// Refund Notification Email Template
exports.getRefundNotificationEmail = (fullName, planName, refundId, errorMessage) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Payment Refunded</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">
            Hi <strong>${fullName}</strong>,
        </p>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            We encountered a technical issue while processing your subscription for the <strong>${planName}</strong> plan. 
            As a result, we have automatically refunded your payment.
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #eff6ff; border-left: 4px solid #2563eb;">
                    <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600; font-size: 18px; font-family: Arial, Helvetica, sans-serif;">💳 Refund Details</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Plan</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${planName}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Refund ID</div>
                                <div style="color: #0f172a; font-size: 14px; font-weight: 600; font-family: 'Courier New', monospace;">${refundId}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Status</div>
                                <div style="color: #dc2626; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Refunded to original payment method</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; margin: 20px 0;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                <strong>What happened?</strong><br>
                ${errorMessage}
            </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px 0;">
                    <p style="font-size: 16px; color: #475569; font-weight: 600; margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif;">
                        Next Steps:
                    </p>
                    <ul style="margin: 12px 0 0 20px; color: #475569; font-family: Arial, Helvetica, sans-serif;">
            <li style="margin: 8px 0;">Your refund will appear in your account within 5-10 business days</li>
            <li style="margin: 8px 0;">You can try subscribing again once the issue is resolved</li>
            <li style="margin: 8px 0;">Contact our support team if you have any questions</li>
        </ul>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 30px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/contact" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Contact Support</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${process.env.FRONTEND_URL}/contact" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Contact Support</a>
                    <!--<![endif]-->
                </td>
            </tr>
            <tr>
                <td>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            We apologize for any inconvenience caused.
        </p>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, `Payment Refunded - ${planName} Plan`);
};

// Password Changed Notification Template
exports.getPasswordChangedEmail = (fullName) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Password Changed Successfully</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Hi <strong>${fullName}</strong>,
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #f0fdf4; border-left: 4px solid #16a34a;">
                    <p style="color: #166534; font-size: 16px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                ✅ Your account password has been successfully changed at ${new Date().toLocaleString()}.
            </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; margin: 20px 0;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                ⚠️ <strong>Didn't make this change?</strong><br>
                If you did not authorize this password change, please reset your password immediately and contact our support team.
            </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 30px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/forgot-password" style="height:48px;v-text-anchor:middle;width:180px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Reset Password</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${process.env.FRONTEND_URL}/forgot-password" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Reset Password</a>
                    <!--<![endif]-->
                </td>
            </tr>
            <tr>
                <td style="padding: 30px 0;">
                    <div style="height: 1px; background-color: #e2e8f0;"></div>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 12px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            For your security, we recommend:
        </p>
                </td>
            </tr>
            <tr>
                <td>
                    <ul style="margin: 12px 0 0 20px; color: #475569; font-family: Arial, Helvetica, sans-serif;">
            <li style="margin: 8px 0;">Using a unique password for your RFP2GRANTS account</li>
            <li style="margin: 8px 0;">Enabling two-factor authentication when available</li>
            <li style="margin: 8px 0;">Never sharing your password with anyone</li>
        </ul>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, 'Your password has been changed');
};

// Enterprise Plan Email Template
exports.getEnterprisePlanEmail = (fullName, email, price, planType, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations, checkoutUrl) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Your Enterprise Plan is Ready! 🚀</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">
            Hello <strong>${fullName}</strong>,
        </p>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Your custom enterprise plan has been created with features tailored specifically for your organization. 
            Review the details below and complete your payment to activate your subscription.
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #eff6ff; border-left: 4px solid #2563eb;">
                    <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600; font-size: 18px; font-family: Arial, Helvetica, sans-serif;">📦 Plan Details</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Price</div>
                                <div style="color: #16a34a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">$${price}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Plan Type</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${planType}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Max Editors</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${maxEditors}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Max Viewers</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${maxViewers}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Max RFP Proposal Generations</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${maxRFPProposalGenerations}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Max Grant Proposal Generations</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${maxGrantProposalGenerations}</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 30px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${checkoutUrl}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Complete Payment Securely →</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${checkoutUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Complete Payment Securely →</a>
                    <!--<![endif]-->
                </td>
            </tr>
            <tr>
                <td align="center">
                    <p style="text-align: center; color: #64748b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            🔒 All payments are processed securely through Stripe
        </p>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, `Your Enterprise Plan Payment Link - RFP2GRANTS`);
};

// Enterprise Payment Success Template
exports.getEnterprisePaymentSuccessEmail = (fullName, planType, price, maxEditors, maxViewers, maxRFPProposalGenerations, maxGrantProposalGenerations) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Enterprise Plan Activated! 🎉</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Hello <strong>${fullName}</strong>,
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #f0fdf4; border-left: 4px solid #16a34a;">
                    <p style="color: #166534; font-size: 16px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                🎊 Your payment for the custom Enterprise Plan was successful! Your account has been upgraded with all premium features.
            </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #eff6ff; border-left: 4px solid #2563eb; margin: 20px 0;">
                    <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600; font-size: 18px; font-family: Arial, Helvetica, sans-serif;">📦 Your Active Plan</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Plan Type</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${planType}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Price</div>
                                <div style="color: #16a34a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">$${price}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Max Editors</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${maxEditors} team members</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Max Viewers</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${maxViewers} team members</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">RFP Proposal Generations</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${maxRFPProposalGenerations} per cycle</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Grant Proposal Generations</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${maxGrantProposalGenerations} per cycle</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 30px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/dashboard" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Access Your Dashboard →</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Access Your Dashboard →</a>
                    <!--<![endif]-->
                </td>
            </tr>
            <tr>
                <td>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
            Thank you for choosing RFP2GRANTS Enterprise. Our team is here to support your success!
        </p>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, 'Enterprise Plan Payment Successful');
};

// Enterprise Payment Failed Template
exports.getEnterprisePaymentFailedEmail = (fullName) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">Payment Issue Detected</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">
            Hello <strong>${fullName}</strong>,
        </p>
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif;">
            We were unable to process your payment for the custom Enterprise Plan. This can happen for several reasons:
        </p>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <ul style="margin: 12px 0 0 20px; color: #475569; font-family: Arial, Helvetica, sans-serif;">
            <li style="margin: 8px 0;">Insufficient funds in your account</li>
            <li style="margin: 8px 0;">Payment method declined by your bank</li>
            <li style="margin: 8px 0;">Network connectivity issues during checkout</li>
            <li style="margin: 8px 0;">Payment details entered incorrectly</li>
        </ul>
                </td>
            </tr>
            <tr>
                <td style="padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                Don't worry! You can try again or contact our support team for assistance.
            </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 30px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                            <td style="padding-bottom: 10px;">
                                <!--[if mso]>
                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/pricing" style="height:48px;v-text-anchor:middle;width:150px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Try Again</center>
                                </v:roundrect>
                                <![endif]-->
                                <!--[if !mso]><!-->
                                <a href="${process.env.FRONTEND_URL}/pricing" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Try Again</a>
                                <!--<![endif]-->
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <!--[if mso]>
                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${process.env.FRONTEND_URL}/contact" style="height:48px;v-text-anchor:middle;width:180px;" arcsize="17%" strokecolor="#64748b" fillcolor="#64748b">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Contact Support</center>
                                </v:roundrect>
                                <![endif]-->
                                <!--[if !mso]><!-->
                                <a href="${process.env.FRONTEND_URL}/contact" style="display: inline-block; padding: 14px 32px; background-color: #64748b; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Contact Support</a>
                                <!--<![endif]-->
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, 'Enterprise Plan Payment Failed');
};

// Contact Form Email Template (for Support Team)
exports.getContactFormEmail = (name, email, company, description) => {
    const content = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding-bottom: 20px;">
                    <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif;">New Contact Request 📬</h1>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 20px;">
                    <p style="font-size: 16px; color: #475569; line-height: 1.8; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                        A new contact request has been submitted through the website contact form.
                    </p>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #eff6ff; border-left: 4px solid #2563eb;">
                    <p style="margin: 0 0 16px 0; color: #1e40af; font-weight: 600; font-size: 18px; font-family: Arial, Helvetica, sans-serif;">📋 Contact Details</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Name</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${name}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; ${company ? 'border-bottom: 1px solid #e2e8f0;' : ''}">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Email Address</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">
                                    <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
                                </div>
                            </td>
                        </tr>
                        ${company ? `
                        <tr>
                            <td style="padding: 10px 0;">
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Company</div>
                                <div style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">${company}</div>
                            </td>
                        </tr>
                        ` : ''}
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding: 20px; background-color: #f0fdf4; border-left: 4px solid #16a34a; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0; color: #166534; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">📝 Message:</p>
                    <p style="margin: 0; color: #166534; white-space: pre-wrap; word-break: break-word; font-family: Arial, Helvetica, sans-serif;">${description}</p>
                </td>
            </tr>
            <tr>
                <td style="padding: 30px 0;">
                    <div style="height: 1px; background-color: #e2e8f0;"></div>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding-bottom: 20px;">
                    <p style="text-align: center; color: #64748b; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                        💡 <strong>Quick Action:</strong> Reply directly to <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a> to respond to this inquiry
                    </p>
                </td>
            </tr>
            <tr>
                <td align="center" style="padding: 30px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="mailto:${email}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="#2563eb" fillcolor="#2563eb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial, sans-serif;font-size:16px;font-weight:600;">Reply to ${name} →</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="mailto:${email}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; font-family: Arial, Helvetica, sans-serif; border-radius: 8px;">Reply to ${name} →</a>
                    <!--<![endif]-->
                </td>
            </tr>
        </table>
    `;

    return getBaseTemplate(content, `New Contact Request from ${name}`);
};