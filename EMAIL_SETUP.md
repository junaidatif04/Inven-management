# 📧 Email Notification Setup Guide

This guide will help you set up email notifications for the inventory management system using EmailJS.

## 🚀 Quick Setup (5 minutes)

### Step 1: Create EmailJS Account
1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create Email Service
1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider:
   - **Gmail** (recommended for testing)
   - **Outlook**
   - **Yahoo**
   - **Custom SMTP**
4. Follow the setup wizard
5. **Copy the Service ID** (e.g., `service_abc123`)

### Step 3: Create Email Templates

Create these 4 templates in EmailJS:

#### Template 1: Request Confirmation
- **Template ID**: `template_confirmation`
- **Subject**: `Access Request Received - Under Review`
- **Content**:
```
Dear {{to_name}},

Thank you for requesting {{requested_role}} access to our Inventory Management System.

Your request is now under review. We'll notify you within 1-2 business days.

Best regards,
Inventory Management Team
```

#### Template 2: Request Approval
- **Template ID**: `template_approval`
- **Subject**: `Access Request Approved - Complete Your Setup`
- **Content**:
```
Dear {{to_name}},

Great news! Your {{requested_role}} access has been approved.

Complete your setup: {{signup_link}}

This link expires in 7 days.

Best regards,
Inventory Management Team
```

#### Template 3: Request Rejection
- **Template ID**: `template_rejection`
- **Subject**: `Access Request Update`
- **Content**:
```
Dear {{to_name}},

We are unable to approve your {{requested_role}} access request at this time.

{{rejection_reason}}

Contact support@company.com for questions.

Best regards,
Inventory Management Team
```

#### Template 4: Welcome Email
- **Template ID**: `template_welcome`
- **Subject**: `Welcome to Inventory Management System`
- **Content**:
```
Dear {{to_name}},

Welcome! Your {{user_role}} account is ready.

Access the system: {{login_url}}

Best regards,
Inventory Management Team
```

### Step 4: Get Public Key
1. In EmailJS dashboard, go to **Account**
2. Copy your **Public Key** (e.g., `user_abc123xyz`)

### Step 5: Update Configuration
Update the constants in `src/services/emailService.ts`:

```typescript
const EMAILJS_SERVICE_ID = 'your_service_id_here';
const EMAILJS_PUBLIC_KEY = 'your_public_key_here';
```

### Step 6: Enable Email Sending
In `src/services/emailService.ts`, uncomment the actual email sending lines:

```typescript
// Change this:
// await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_CONFIRMATION, templateParams);

// To this:
await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_CONFIRMATION, templateParams);
```

## 🧪 Testing Email Setup

### Test 1: Request Confirmation
1. Go to `/request-access`
2. Submit a request
3. Check console for email log
4. Verify email received

### Test 2: Approval Email
1. Sign in as admin
2. Go to Access Requests
3. Approve a request
4. Check console for signup link
5. Verify approval email received

### Test 3: Rejection Email
1. Reject a request with reason
2. Verify rejection email received

### Test 4: Welcome Email
1. Use signup link from approval
2. Complete account setup
3. Verify welcome email received

## 🔧 Alternative Email Solutions

### Option 1: SendGrid (Production Recommended)
- More reliable for production
- Better deliverability
- Requires backend API

### Option 2: Nodemailer + Express API
- Full control over email sending
- Requires backend server
- Better for complex email logic

### Option 3: Firebase Functions + SendGrid
- Serverless email sending
- Integrates well with Firebase
- Requires Firebase Functions setup

## 📊 Current Implementation Status

✅ **Email Service Created**: All email functions implemented
✅ **Templates Designed**: Professional email templates ready
✅ **Integration Complete**: All user flows include email notifications
⏳ **EmailJS Setup**: Requires your EmailJS account configuration
⏳ **Testing**: Ready for testing once configured

## 🚨 Important Notes

1. **Free Tier Limits**: EmailJS free tier allows 200 emails/month
2. **Spam Filters**: Test with multiple email providers
3. **Template Variables**: Ensure all {{variables}} are properly mapped
4. **Error Handling**: Emails fail gracefully without breaking the app
5. **Console Logs**: All email content is logged for debugging

## 📞 Support

If you need help setting up emails:
1. Check the browser console for detailed email logs
2. Verify EmailJS service and template IDs
3. Test with a simple template first
4. Contact EmailJS support for service-specific issues

---

**Once configured, your users will receive professional email notifications at every step of the access request process!** 🎉
