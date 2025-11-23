# Setting Up Google OAuth Credentials for Blogger

To use the Blogger functionality in this extension, you need to create OAuth 2.0 credentials in Google Cloud Console.

## Step-by-Step Guide

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click on the project dropdown at the top (next to "Google Cloud")
4. Click "New Project"
5. Enter a project name (e.g., "VS Code Live Blog Writer")
6. Click "Create"
7. Wait for the project to be created and select it

### 2. Enable the Blogger API

1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for "Blogger API v3"
3. Click on "Blogger API v3"
4. Click the **"Enable"** button
5. Wait for the API to be enabled

### 3. Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace account)
3. Click **Create**
4. Fill in the required information:
   - **App name**: VS Code Live Blog Writer
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **Save and Continue**
6. On the "Scopes" page, click **Add or Remove Scopes**
7. Search for "Blogger API v3" and select:
   - `.../auth/blogger` - Manage your Blogger account
8. Click **Update** then **Save and Continue**
9. On the "Test users" page, click **Add Users**
10. Add your Google email address (the one you'll use with Blogger)
11. Click **Save and Continue**
12. Review and click **Back to Dashboard**

### 4. Create OAuth 2.0 Credentials

1. In the left sidebar, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
4. For "Application type", select **Web application**
5. Enter a name: "VS Code Blogger Extension"
6. Under **Authorized redirect URIs**, click **Add URI**
7. Enter: `http://localhost:54321/callback`
8. Click **Create**
9. A dialog will appear with your credentials
10. **Copy both the Client ID and Client Secret**:
    - Client ID looks like: `123456789-abc123.apps.googleusercontent.com`
    - Client Secret looks like: `GOCSPX-...`
11. **Important**: Keep these credentials secure and don't share them publicly
12. Click **OK**

### 5. Configure the Extension

1. Open VS Code
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
3. Run: **"Live Blog Writer: Set Blogger Credentials"**
4. Paste the **Client ID** you copied from step 4
5. Press Enter
6. Paste the **Client Secret**
7. Press Enter

### 6. Authenticate with Google

1. Open the Command Palette again
2. Run: **"Live Blog Writer: Authenticate with Blogger"**
3. Your browser will open to Google's sign-in page
4. Sign in with your Google account
5. Grant the requested permissions
6. You should see "Authentication Successful!" in the browser
7. Return to VS Code - you're ready to publish!

## Troubleshooting

### "Access blocked: authorization error"

This means the OAuth client is not properly configured. Make sure you:
- Enabled the Blogger API v3
- Added the correct redirect URI: `http://localhost:54321/callback`
- Added yourself as a test user in the OAuth consent screen

### "This app isn't verified"

This is normal for apps in testing mode. Click **"Advanced"** > **"Go to [App Name] (unsafe)"** to proceed. Your own app is safe to use.

### "redirect_uri_mismatch"

Make sure you added exactly `http://localhost:54321/callback` (with no trailing slash) in the Authorized redirect URIs.

### Port 54321 already in use

If another application is using port 54321, you'll need to:
1. Close the other application, or
2. Modify the port in `GoogleOAuthService.ts` and update the redirect URI in Google Cloud Console

## Security Notes

- **Never share your Client Secret publicly** - It should be kept confidential
- The Client ID is safe to share but keep the secret private
- The extension only requests the minimum scope needed: `https://www.googleapis.com/auth/blogger`
- All credentials and tokens are stored securely in VS Code's Secret Storage
- Tokens are automatically refreshed and never expire as long as you don't revoke access
- If you suspect your credentials are compromised, regenerate them in Google Cloud Console

## What Data Does the Extension Access?

The extension only accesses:
- Your Blogger blog posts (to create, update, and list them)
- Your Blogger blog information (blog ID, title)

The extension **does not** access:
- Your Google Drive
- Your Gmail
- Your personal information beyond basic profile
- Any other Google services

You can revoke access at any time from your [Google Account permissions page](https://myaccount.google.com/permissions).
