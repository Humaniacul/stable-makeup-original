# Resend Integration Setup for Automated Email Verification

This guide will help you integrate Resend with your Supabase authentication system for automated email verification. We'll cover two approaches: SMTP integration (simpler) and Auth Hooks (more advanced with custom templates).

## ⚠️ IMPORTANT: Preventing Emails from Going to Spam

### Quick Anti-Spam Checklist:
1. ✅ **Use a verified domain** (not @gmail.com or free domains)
2. ✅ **Set up SPF, DKIM, and DMARC records**
3. ✅ **Use a professional sender name and email**
4. ✅ **Avoid spam trigger words** in subject lines
5. ✅ **Include proper email headers and formatting**

## Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Domain Verification**: Verify your domain in Resend dashboard ⚠️ **CRITICAL FOR DELIVERABILITY**
3. **API Key**: Create a Resend API key
4. **DNS Access**: You'll need to add DNS records to your domain

## Step 0: Domain Setup (CRITICAL for Avoiding Spam)

### Option A: Use Your Own Domain (Recommended)
If you have a domain (e.g., `beautify-app.com`):

1. **Add Domain in Resend**:
   - Go to Resend Dashboard → Domains
   - Click "Add Domain"
   - Enter your domain (e.g., `beautify-app.com`)

2. **Add Required DNS Records**:
   Resend will provide you with DNS records to add to your domain:
   
   ```
   # SPF Record (TXT)
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   
   # DKIM Record (TXT) 
   Type: TXT
   Name: resend._domainkey
   Value: [Resend will provide this]
   
   # DMARC Record (TXT)
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

3. **Verify Domain**:
   - Wait for DNS propagation (up to 48 hours)
   - Click "Verify" in Resend dashboard
   - Status should show "Verified" ✅

### Option B: Use Resend's Shared Domain (Temporary)
For testing, you can use: `onboarding@resend.dev`
**Note**: This may have lower deliverability rates.

### Option C: Free Domain Setup
If you don't have a domain, consider these options:
- **Namecheap**: ~$10/year for .com domains
- **Cloudflare**: Domain registration + free DNS
- **Freenom**: Free domains (lower reputation)

## Method 1: SMTP Integration (Recommended for Quick Setup)

### Step 1: Get Resend SMTP Credentials

In your Resend dashboard, you'll use these credentials:
- **Host**: `smtp.resend.com`
- **Port**: `465`
- **Username**: `resend`
- **Password**: `YOUR_RESEND_API_KEY`

### Step 2: Configure Supabase SMTP

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Authentication**
3. Scroll down to the **SMTP Settings** section
4. Toggle **Enable Custom SMTP**
5. Fill in the following details:
   - **Sender Name**: `Beautify Team` (avoid "Support" or "No-Reply")
   - **Sender Email**: `hello@yourdomain.com` (use your verified domain!)
   - **Host**: `smtp.resend.com`
   - **Port Number**: `465`
   - **Username**: `resend`
   - **Password**: `YOUR_RESEND_API_KEY`
6. Click **Save**

### ⚠️ Critical: Update Email Templates for Better Deliverability

Go to **Authentication** → **Email Templates** in Supabase and update:

#### Professional Confirm Signup Template (OTP Version):
**Subject:** Welcome to Beautify ✨ Please verify your email

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Beautify</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    
    <!-- Main Container -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; min-height: 100vh;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Email Content Wrapper -->
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); overflow: hidden;">
                    
                    <!-- Header Section -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%); padding: 40px 40px 50px 40px; text-align: center;">
                            <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                                ✨ Beautify
                            </h1>
                            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">
                                AI-Powered Beauty & Makeup
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Welcome Message -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #FF6B9D, #FFB6C1); border-radius: 50%; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 36px;">
                                    💄
                                </div>
                                <h2 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 28px; font-weight: 600;">
                                    Welcome to Beautify!
                                </h2>
                                <p style="margin: 0; color: #7f8c8d; font-size: 16px; line-height: 1.5;">
                                    Your beauty transformation journey starts here
                                </p>
                            </div>
                            
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                                <p style="margin: 0 0 20px 0; color: #2c3e50; font-size: 16px; line-height: 1.6;">
                                    Hi <strong>{{ .Name }}</strong>,
                                </p>
                                <p style="margin: 0 0 24px 0; color: #5a6c7d; font-size: 15px; line-height: 1.6;">
                                    Thank you for joining Beautify! We're excited to help you discover new makeup looks and beauty transformations with the power of AI.
                                </p>
                                <p style="margin: 0 0 24px 0; color: #5a6c7d; font-size: 15px; line-height: 1.6;">
                                    To get started, please verify your email address by entering this 6-digit code in the app:
                                </p>
                                
                                <!-- Verification Code -->
                                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <table cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 2px solid #FF6B9D; border-radius: 12px; padding: 20px 30px;">
                                                <tr>
                                                    <td align="center">
                                                        <div style="color: #FF6B9D; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                            {{ .Token }}
                                                        </div>
                                                        <div style="color: #7f8c8d; font-size: 12px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;">
                                                            Verification Code
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 0; color: #95a5a6; font-size: 13px; text-align: center;">
                                    This code expires in 1 hour for security
                                </p>
                            </div>
                            
                            <!-- What's Next Section -->
                            <div style="border-top: 1px solid #ecf0f1; padding-top: 30px;">
                                <h3 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 18px; font-weight: 600;">
                                    What's waiting for you:
                                </h3>
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                    <tr>
                                        <td style="padding: 12px 0; vertical-align: top; width: 40px;">
                                            <span style="font-size: 20px;">🤳</span>
                                        </td>
                                        <td style="padding: 12px 0; vertical-align: top;">
                                            <div style="color: #2c3e50; font-weight: 600; font-size: 14px; margin-bottom: 4px;">AI Makeup Try-On</div>
                                            <div style="color: #7f8c8d; font-size: 13px; line-height: 1.4;">See how different makeup looks suit you instantly</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; vertical-align: top; width: 40px;">
                                            <span style="font-size: 20px;">💫</span>
                                        </td>
                                        <td style="padding: 12px 0; vertical-align: top;">
                                            <div style="color: #2c3e50; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Personalized Recommendations</div>
                                            <div style="color: #7f8c8d; font-size: 13px; line-height: 1.4;">Get beauty product suggestions tailored to your style</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; vertical-align: top; width: 40px;">
                                            <span style="font-size: 20px;">🎨</span>
                                        </td>
                                        <td style="padding: 12px 0; vertical-align: top;">
                                            <div style="color: #2c3e50; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Trending Looks</div>
                                            <div style="color: #7f8c8d; font-size: 13px; line-height: 1.4;">Discover the latest makeup trends and tutorials</div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #ecf0f1;">
                            <p style="margin: 0 0 15px 0; color: #7f8c8d; font-size: 13px;">
                                Need help? We're here for you!
                            </p>
                            <p style="margin: 0 0 20px 0;">
                                <a href="mailto:support@beautify-app.com" style="color: #FF6B9D; text-decoration: none; font-weight: 600; font-size: 13px;">
                                    Contact Support
                                </a>
                            </p>
                            <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 20px;">
                                <p style="margin: 0 0 8px 0; color: #bdc3c7; font-size: 11px;">
                                    © 2024 Beautify AI. All rights reserved.
                                </p>
                                <p style="margin: 0; color: #bdc3c7; font-size: 11px;">
                                    This email was sent to {{ .Email }} because you signed up for Beautify.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
```

#### Professional Password Reset Template:
**Subject:** Secure your Beautify account - Password reset requested

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Beautify Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; min-height: 100vh;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 40px 40px 50px 40px; text-align: center;">
                            <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                                ✨ Beautify
                            </h1>
                            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">
                                Password Reset Request
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3498db, #74b9ff); border-radius: 50%; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 36px;">
                                    🔒
                                </div>
                                <h2 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 26px; font-weight: 600;">
                                    Reset Your Password
                                </h2>
                                <p style="margin: 0; color: #7f8c8d; font-size: 16px; line-height: 1.5;">
                                    Secure your Beautify account
                                </p>
                            </div>
                            
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
                                <p style="margin: 0 0 20px 0; color: #2c3e50; font-size: 16px; line-height: 1.6;">
                                    Hi <strong>{{ .Name }}</strong>,
                                </p>
                                <p style="margin: 0 0 24px 0; color: #5a6c7d; font-size: 15px; line-height: 1.6;">
                                    We received a request to reset your Beautify account password. Use the verification code below to create a new password:
                                </p>
                                
                                <!-- Reset Code -->
                                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <table cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 2px solid #3498db; border-radius: 12px; padding: 20px 30px;">
                                                <tr>
                                                    <td align="center">
                                                        <div style="color: #3498db; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                            {{ .Token }}
                                                        </div>
                                                        <div style="color: #7f8c8d; font-size: 12px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;">
                                                            Reset Code
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 0; color: #95a5a6; font-size: 13px; text-align: center;">
                                    This code expires in 1 hour for your security
                                </p>
                            </div>
                            
                            <!-- Security Notice -->
                            <div style="background: #fff9e6; border-left: 4px solid #f39c12; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                    <tr>
                                        <td style="width: 30px; vertical-align: top;">
                                            <span style="font-size: 20px;">⚠️</span>
                                        </td>
                                        <td style="vertical-align: top;">
                                            <div style="color: #d68910; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
                                                Security Notice
                                            </div>
                                            <div style="color: #b7950b; font-size: 13px; line-height: 1.5;">
                                                If you didn't request this password reset, please ignore this email. Your account remains secure and no changes have been made.
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #ecf0f1;">
                            <p style="margin: 0 0 15px 0; color: #7f8c8d; font-size: 13px;">
                                Need help? We're here for you!
                            </p>
                            <p style="margin: 0 0 20px 0;">
                                <a href="mailto:support@beautify-app.com" style="color: #3498db; text-decoration: none; font-weight: 600; font-size: 13px;">
                                    Contact Support
                                </a>
                            </p>
                            <div style="border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 20px;">
                                <p style="margin: 0 0 8px 0; color: #bdc3c7; font-size: 11px;">
                                    © 2024 Beautify AI. All rights reserved.
                                </p>
                                <p style="margin: 0; color: #bdc3c7; font-size: 11px;">
                                    This security email was sent to {{ .Email }}.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
```

### Step 3: Test Email Verification

Your authentication system will now automatically send verification emails through Resend when users:
- Sign up with email
- Request password reset
- Change their email address

## OTP (Verification Codes) Configuration

If you want to use 6-digit verification codes instead of email links, you'll need to configure Supabase for OTP:

### Step 1: Enable OTP in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Authentication**
3. Scroll down to **Auth Providers**
4. Enable **Email** provider if not already enabled
5. Under **Email Auth**, make sure **Enable email confirmations** is checked

### Step 2: Configure Email Templates for OTP

In your Supabase dashboard:
1. Go to **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. Modify the template to include the verification code:

```html
<h2>Verify your email for Beautify</h2>
<p>Hello {{ .Name }},</p>
<p>Thank you for signing up for Beautify! Please use the verification code below to confirm your email address:</p>
<div style="font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background-color: #f5f5f5; border-radius: 8px; margin: 20px 0;">
  {{ .Token }}
</div>
<p>This code will expire in 1 hour.</p>
<p>If you didn't create an account with Beautify, you can safely ignore this email.</p>
```

### Step 3: Update Other Email Templates

Similarly update the **Recovery** and **Email Change** templates to use verification codes instead of links.

### Step 4: App Configuration

Your mobile app is already configured to:
- Send OTP codes during signup
- Show a verification screen for entering 6-digit codes
- Verify codes and complete user registration
- Handle resending codes with a timer

## Method 2: Auth Hooks with Custom Templates (Advanced)

This method gives you complete control over email content and styling using React Email templates.

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Initialize Supabase Functions

In your project directory:

```bash
supabase init
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Create Send Email Function

```bash
supabase functions new send-email
```

### Step 4: Create Environment Variables

Create `supabase/functions/.env`:

```
RESEND_API_KEY=your_resend_api_key_here
SEND_EMAIL_HOOK_SECRET=your_webhook_secret_here
```

### Step 5: Implement the Email Function

Replace the content of `supabase/functions/send-email/index.ts`:

```typescript
import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { BeautifyVerificationEmail } from './_templates/verification-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecret)

  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
        user_metadata?: {
          full_name?: string
        }
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    // Determine email subject and content based on action type
    let subject = 'Welcome to Beautify!'
    let emailTemplate = BeautifyVerificationEmail

    switch (email_action_type) {
      case 'signup':
        subject = 'Welcome to Beautify! Verify your email'
        break
      case 'recovery':
        subject = 'Reset your Beautify password'
        break
      case 'email_change':
        subject = 'Confirm your new email address'
        break
      case 'invite':
        subject = 'You\'ve been invited to Beautify'
        break
      default:
        subject = 'Beautify - Email Verification'
    }

    const html = await renderAsync(
      React.createElement(emailTemplate, {
        userEmail: user.email,
        userName: user.user_metadata?.full_name || 'Beauty Enthusiast',
        verificationUrl: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`,
        verificationCode: token,
        actionType: email_action_type,
      })
    )

    const { error } = await resend.emails.send({
      from: 'Beautify <noreply@yourdomain.com>', // Replace with your verified domain
      to: [user.email],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log(`Email sent successfully to ${user.email} for ${email_action_type}`)

  } catch (error) {
    console.error('Email sending failed:', error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message || 'Failed to send email',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Step 6: Create Email Template

Create `supabase/functions/send-email/_templates/verification-email.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface BeautifyVerificationEmailProps {
  userEmail: string
  userName: string
  verificationUrl: string
  verificationCode: string
  actionType: string
}

export const BeautifyVerificationEmail = ({
  userEmail,
  userName,
  verificationUrl,
  verificationCode,
  actionType,
}: BeautifyVerificationEmailProps) => {
  const getActionText = () => {
    switch (actionType) {
      case 'signup':
        return {
          title: 'Welcome to Beautify!',
          description: 'Thanks for joining Beautify! Please verify your email address to get started with your beauty journey.',
          buttonText: 'Verify Email Address',
        }
      case 'recovery':
        return {
          title: 'Reset Your Password',
          description: 'We received a request to reset your password. Click the button below to create a new password.',
          buttonText: 'Reset Password',
        }
      case 'email_change':
        return {
          title: 'Confirm Email Change',
          description: 'Please confirm your new email address to complete the change.',
          buttonText: 'Confirm Email',
        }
      default:
        return {
          title: 'Email Verification',
          description: 'Please verify your email address to continue.',
          buttonText: 'Verify Email',
        }
    }
  }

  const actionText = getActionText()

  return (
    <Html>
      <Head />
      <Preview>{actionText.title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logo}>✨ Beautify</Text>
          </Section>
          
          <Heading style={h1}>{actionText.title}</Heading>
          
          <Text style={greeting}>Hi {userName},</Text>
          
          <Text style={text}>{actionText.description}</Text>
          
          <Section style={buttonSection}>
            <Button href={verificationUrl} style={button}>
              {actionText.buttonText}
            </Button>
          </Section>
          
          <Text style={text}>
            Or copy and paste this verification code:
          </Text>
          
          <Section style={codeSection}>
            <Text style={code}>{verificationCode}</Text>
          </Section>
          
          <Text style={smallText}>
            This link will expire in 24 hours for security reasons.
          </Text>
          
          <Text style={smallText}>
            If you didn't request this email, you can safely ignore it.
          </Text>
          
          <Section style={footer}>
            <Text style={footerText}>
              Best regards,<br />
              The Beautify Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#0f0f0f',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const logoSection = {
  padding: '0 0 20px',
  textAlign: 'center' as const,
}

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#ff69b4',
  margin: '0',
}

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const greeting = {
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 20px',
}

const text = {
  color: '#cccccc',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 20px',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#ff69b4',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const codeSection = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #333333',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '20px 0',
}

const code = {
  color: '#ff69b4',
  fontSize: '20px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  margin: '0',
}

const smallText = {
  color: '#999999',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '0 0 10px',
}

const footer = {
  borderTop: '1px solid #333333',
  marginTop: '40px',
  paddingTop: '20px',
}

const footerText = {
  color: '#cccccc',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '0',
}

export default BeautifyVerificationEmail
```

### Step 7: Deploy the Function

```bash
supabase functions deploy send-email --no-verify-jwt
```

### Step 8: Configure Auth Hook

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Hooks**
3. Click **Create a new hook**
4. Select **Send Email Hook**
5. Choose **HTTP Request**
6. Enter your function URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email`
7. Click **Generate Secret** and copy it
8. Save the hook

### Step 9: Set Environment Variables

```bash
supabase secrets set --env-file supabase/functions/.env
```

## Testing Your Setup

### For SMTP Integration:
1. Try signing up a new user
2. Check if verification email is received
3. Verify the email comes from your Resend domain

### For Auth Hooks Integration:
1. Test different email actions (signup, recovery, email change)
2. Verify custom styling and branding
3. Check Supabase function logs for any errors

### Test OTP Flow:
1. Try signing up with a new email address
2. Check email delivery: Verify that verification codes are sent via Resend
3. Test code verification: Enter the 6-digit code in your app
4. Test resend function: Try resending codes after the timer expires

## Troubleshooting

### Common Issues:

1. **Emails not sending**: 
   - Verify your domain in Resend
   - Check API key permissions
   - Ensure SMTP credentials are correct

2. **Auth Hook not triggering**:
   - Verify webhook secret is set correctly
   - Check function deployment status
   - Review function logs in Supabase dashboard

3. **Template rendering errors**:
   - Ensure React Email components are properly imported
   - Check for TypeScript errors in templates

### Monitoring:

- **Resend Dashboard**: Monitor email delivery rates and bounces
- **Supabase Logs**: Check function execution logs
- **Auth Events**: Monitor authentication events in Supabase

### Common Issues with OTP:

1. **Codes not arriving**: Check your Resend dashboard for delivery status
2. **Invalid code errors**: Ensure codes are entered within the 1-hour expiry window
3. **User creation issues**: Check that your database schema allows OTP-based signups

### SMTP Issues:

1. **Authentication failed**: Double-check your Resend API key
2. **Domain verification**: Ensure your sender domain is verified in Resend
3. **Rate limits**: Check Resend dashboard for any rate limiting issues

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS for production apps
2. **Rate Limiting**: Implement rate limiting for OTP requests
3. **Code Expiry**: Use appropriate expiry times for verification codes
4. **Domain Verification**: Always verify your sending domain in Resend

## Next Steps

1. **Customize Templates**: Modify the email templates to match your brand
2. **Add More Templates**: Create templates for different email types
3. **Analytics**: Set up email analytics in Resend dashboard
4. **Domain Authentication**: Configure SPF, DKIM, and DMARC records
5. **Rate Limiting**: Configure appropriate rate limits for email sending

6. Test the complete authentication flow
7. Monitor email delivery rates in Resend dashboard
8. Set up email analytics to track user engagement
9. Consider implementing additional security measures like 2FA

For support, check:
- [Resend Documentation](https://resend.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- Your Resend dashboard for delivery insights

Your Beautify app now has professional, automated email verification powered by Resend! 🎉 