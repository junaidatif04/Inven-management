import emailjs from '@emailjs/browser';
import { AccessRequest } from './accessRequestService';

// EmailJS configuration from environment variables
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Initialize EmailJS only if credentials are available
if (EMAILJS_PUBLIC_KEY) {
  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  } catch (error) {
    console.error('EmailJS initialization failed:', error);
  }
} else {
  console.warn('EmailJS credentials not configured. Email functionality will be disabled.');
}

export interface EmailTemplate {
  to_email: string;
  to_name: string;
  from_name: string;
  subject: string;
  message: string;
  [key: string]: any;
}

// Email sending with EmailJS as primary service
export const sendEmailViaWebService = async (emailData: EmailTemplate): Promise<void> => {
  // Check if EmailJS is configured
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS not configured. Skipping email send.');
    return;
  }

  // Try EmailJS first
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: emailData.to_email,
        to_name: emailData.to_name,
        subject: emailData.subject,
        message: emailData.message,
        from_name: emailData.from_name
      }
    );
    console.log('Email sent successfully via EmailJS');
    return; // Success, exit function

  } catch (emailjsError) {
    console.error('EmailJS failed:', emailjsError);
    // Note: Formspree fallback removed as the endpoint was returning 404
    // You can add alternative email services here if needed
  }

  // If all services fail, log the issue
  console.error('All email services failed. Email could not be sent.');
};

// Send confirmation email when request is submitted
export const sendRequestConfirmationEmail = async (request: AccessRequest): Promise<void> => {
  try {
    const emailContent = `
Dear ${request.name},

Thank you for requesting ${getRoleDisplayName(request.requestedRole)} access to our Inventory Management System.

Your request details:
- Name: ${request.name}
- Email: ${request.email}
- Requested Role: ${getRoleDisplayName(request.requestedRole)}
${request.company ? `- Company: ${request.company}` : ''}
${request.department ? `- Department: ${request.department}` : ''}
${request.reason ? `- Reason: ${request.reason}` : ''}
${request.experience ? `- Experience Level: ${request.experience}` : ''}
${request.referral ? `- Referral Source: ${request.referral}` : ''}
${request.expectedUsage ? `- Expected Usage: ${request.expectedUsage}` : ''}

What happens next:
1. An administrator will review your request within 1-2 business days
2. You'll receive an email notification with the decision
3. If approved, you'll get a secure link to complete your account setup

If you have any questions, please contact our support team at support@company.com.

Best regards,
Inventory Management Team
    `;

    const emailData: EmailTemplate = {
      to_email: request.email,
      to_name: request.name,
      from_name: 'Inventory Management System',
      subject: 'Access Request Received - Under Review',
      message: emailContent,
      requested_role: getRoleDisplayName(request.requestedRole),
      company: request.company || 'N/A',
      department: request.department || 'N/A'
    };



    // Try to send via web service
    await sendEmailViaWebService(emailData);

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    // Don't throw - let the app continue working
  }
};

// Send approval email with signup link
export const sendApprovalEmail = async (
  request: AccessRequest,
  signupToken: string,
  approvedBy: string
): Promise<void> => {
  try {
    const signupLink = `${window.location.origin}/complete-signup?token=${signupToken}`;

    const emailContent = `
Dear ${request.name},

Great news! Your request for ${getRoleDisplayName(request.requestedRole)} access has been approved.

To complete your account setup, please click the link below:
${signupLink}

This link will expire in 7 days for security reasons.

Setup Instructions:
1. Click the link above
2. Choose your preferred sign-in method (Google or Email/Password)
3. Complete your account setup
4. Start using the Inventory Management System

Your approved role: ${getRoleDisplayName(request.requestedRole)}

If you have any questions or need assistance, please contact our support team at support@company.com.

Welcome to the team!

Best regards,
Inventory Management Team
    `;

    const emailData: EmailTemplate = {
      to_email: request.email,
      to_name: request.name,
      from_name: 'Inventory Management System',
      subject: 'Access Request Approved - Complete Your Setup',
      message: emailContent,
      requested_role: getRoleDisplayName(request.requestedRole),
      signup_link: signupLink,
      approved_by: approvedBy
    };



    // Try to send via web service
    await sendEmailViaWebService(emailData);

  } catch (error) {
    console.error('Error sending approval email:', error);
    // Don't throw - let the app continue working
  }
};

// Send rejection email
export const sendRejectionEmail = async (
  request: AccessRequest,
  rejectionReason?: string,
  rejectedBy?: string
): Promise<void> => {
  try {
    const emailContent = `
Dear ${request.name},

Thank you for your interest in accessing our Inventory Management System.

After careful review, we are unable to approve your request for ${getRoleDisplayName(request.requestedRole)} access at this time.

${rejectionReason ? `Reason: ${rejectionReason}` : ''}

Next Steps:
- If you believe this decision was made in error, please contact our support team
- You may submit a new request with additional information if circumstances change
- For questions about access requirements, please reach out to your manager or HR department

Contact Information:
- Email: support@company.com
- Phone: (555) 123-4567

Thank you for your understanding.

Best regards,
Inventory Management Team
    `;

    const emailData: EmailTemplate = {
      to_email: request.email,
      to_name: request.name,
      from_name: 'Inventory Management System',
      subject: 'Access Request Update',
      message: emailContent,
      requested_role: getRoleDisplayName(request.requestedRole),
      rejection_reason: rejectionReason || 'No specific reason provided',
      rejected_by: rejectedBy || 'Administrator'
    };



    // Try to send via web service
    await sendEmailViaWebService(emailData);

  } catch (error) {
    console.error('Error sending rejection email:', error);
    // Don't throw - let the app continue working
  }
};

// Send role update email for existing users
export const sendRoleUpdateEmail = async (
  request: AccessRequest,
  approvedBy?: string
): Promise<void> => {
  try {
    const emailContent = `
Dear ${request.name},

Great news! Your request for ${getRoleDisplayName(request.requestedRole)} access has been approved.

Your role has been successfully updated in the system. You can now access the new features and permissions associated with your ${getRoleDisplayName(request.requestedRole)} role.

What's Next:
1. Sign in to the Inventory Management System
2. Explore your new role features and permissions
3. Check out the updated dashboard
4. Contact support if you need any assistance

Your updated role: ${getRoleDisplayName(request.requestedRole)}
Approved by: ${approvedBy || 'Administrator'}

Role-Specific Resources:
${getRoleResources(request.requestedRole)}

If you have any questions or need assistance with your new role, please contact our support team at support@company.com.

Best regards,
Inventory Management Team
    `;

    const emailData: EmailTemplate = {
      to_email: request.email,
      to_name: request.name,
      from_name: 'Inventory Management System',
      subject: 'Role Updated - Access Approved',
      message: emailContent,
      requested_role: getRoleDisplayName(request.requestedRole),
      approved_by: approvedBy || 'Administrator'
    };

    // Try to send via web service
    await sendEmailViaWebService(emailData);

  } catch (error) {
    console.error('Error sending role update email:', error);
    // Don't throw - let the app continue working
  }
};

// Send welcome email after successful signup
export const sendWelcomeEmail = async (
  user: { name: string; email: string; role: string }
): Promise<void> => {
  try {
    const emailContent = `
Dear ${user.name},

Welcome to the Inventory Management System! Your account has been successfully created.

Account Details:
- Name: ${user.name}
- Email: ${user.email}
- Role: ${getRoleDisplayName(user.role)}

You can now access the system at: ${window.location.origin}

Getting Started:
1. Sign in using your chosen authentication method
2. Explore your dashboard and available features
3. Check out the user guide for your role
4. Contact support if you need any assistance

Role-Specific Resources:
${getRoleResources(user.role)}

If you have any questions or need help getting started, please don't hesitate to contact our support team at support@company.com.

Best regards,
Inventory Management Team
    `;

    const emailData: EmailTemplate = {
      to_email: user.email,
      to_name: user.name,
      from_name: 'Inventory Management System',
      subject: 'Welcome to Inventory Management System',
      message: emailContent,
      user_role: getRoleDisplayName(user.role),
      login_url: window.location.origin
    };



    // Try to send via web service
    await sendEmailViaWebService(emailData);

  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw - let the app continue working
  }
};

// Helper functions
const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'warehouse_staff': return 'Warehouse Staff';
    case 'supplier': return 'Supplier';
    case 'internal_user': return 'Internal User';
    case 'admin': return 'Administrator';
    default: return role;
  }
};

const getRoleResources = (role: string): string => {
  switch (role) {
    case 'warehouse_staff':
      return `
- Inventory Management Guide
- Warehouse Operations Manual
- Shipping & Receiving Procedures`;
    case 'supplier':
      return `
- Supplier Portal Guide
- Product Catalog Management
- Order Processing Procedures`;
    case 'internal_user':
      return `
- User Guide for Internal Staff
- How to Submit Requests
- Catalog Browsing Tips`;
    case 'admin':
      return `
- Administrator Guide
- User Management Manual
- System Configuration Guide`;

    default:
      return '- General User Guide';
  }
};

// Configuration helper for setting up EmailJS
export const configureEmailJS = (): void => {
  // In a real implementation, you would update the constants above
  // and initialize EmailJS with the real credentials
};
