# EmailJS Setup Guide

This guide will help you set up EmailJS for sending emails in your Inventory Management System.

## Prerequisites

1. A Gmail account (or other email provider)
2. An EmailJS account (free tier available)

## Step 1: Create EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

## Step 2: Add Email Service

1. In your EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose "Gmail" (or your preferred email provider)
4. Follow the authentication process to connect your Gmail account
5. Note down the **Service ID** (e.g., `service_abc123`)

## Step 3: Create Email Template

1. Go to "Email Templates" in your dashboard
2. Click "Create New Template"
3. Use this template structure:

```
Subject: {{subject}}

To: {{to_name}} <{{to_email}}>
From: {{from_name}}

Message:
{{message}}

---
Sent via Inventory Management System
```

4. Save the template and note down the **Template ID** (e.g., `template_xyz789`)

## Step 4: Get Public Key

1. Go to "Account" → "General"
2. Find your **Public Key** (e.g., `abc123def456`)

## Step 5: Update Environment Variables

1. Open your `.env` file
2. Replace the placeholder values with your actual credentials:

```env
# EmailJS Configuration
VITE_EMAILJS_SERVICE_ID=your_actual_service_id
VITE_EMAILJS_TEMPLATE_ID=your_actual_template_id
VITE_EMAILJS_PUBLIC_KEY=your_actual_public_key
```

## Step 6: Test the Configuration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Try signing up with email/password to test email sending
3. Check the browser console for success/error messages

## Troubleshooting

### Common Issues

1. **422 Unprocessable Content Error**
   - Check that all environment variables are correctly set
   - Verify your EmailJS service and template IDs
   - Ensure your email template has the correct variable names

2. **Email Not Received**
   - Check your spam folder
   - Verify the recipient email address
   - Check EmailJS dashboard for send logs

3. **Authentication Errors**
   - Re-authenticate your Gmail account in EmailJS
   - Check if 2FA is enabled and use app-specific password if needed

### Testing Tips

- Use your own email address for testing
- Check the EmailJS dashboard for send statistics
- Monitor browser console for detailed error messages

## Security Notes

- Never commit your actual EmailJS credentials to version control
- Use environment variables for all sensitive configuration
- For production deployment, set these variables in your hosting platform:
  - **GitHub Pages**: Repository Settings → Secrets and variables → Actions
  - **Netlify**: Site Settings → Environment variables
  - **Vercel**: Project Settings → Environment Variables

## Alternative Email Services

If EmailJS doesn't work for your use case, you can integrate other services:

- **SendGrid**: Professional email API
- **Mailgun**: Transactional email service
- **AWS SES**: Amazon's email service
- **Resend**: Modern email API

To add alternative services, modify the `sendEmailViaWebService` function in `src/services/emailService.ts`.

## Support

If you encounter issues:

1. Check the [EmailJS Documentation](https://www.emailjs.com/docs/)
2. Review the browser console for error messages
3. Test your EmailJS configuration directly on their website
4. Contact EmailJS support if the issue persists