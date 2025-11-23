# Blogger OAuth 2.0 Authentication Setup

## Problem Fixed

The extension was previously using API keys for Blogger authentication, which only works for **read-only** operations. Creating and updating blog posts requires **OAuth 2.0 authentication** with proper user permissions.

## Changes Made

1. **Updated `BloggerService.ts`**:
   - Changed from API key authentication to OAuth 2.0 access token
   - Now uses `Authorization: Bearer <token>` header instead of API key parameter
   - All API requests (create, update, list) now use OAuth tokens

2. **Updated `extension.ts`**:
   - Removed `setBloggerApiKey` command
   - Added `authenticateBlogger` command that uses VS Code's built-in Google authentication
   - Modified `publishToBlogger` to request OAuth session with Blogger API scope
   - Uses VS Code's `vscode.authentication.getSession()` API with Google provider

3. **Updated `package.json`**:
   - Replaced "Set Blogger API Key" command with "Authenticate with Blogger" command

4. **Updated `README.md`**:
   - Removed API key setup instructions
   - Added OAuth authentication instructions
   - Added instructions for finding Blogger Blog ID

## How to Use (For Extension Users)

### First-Time Setup

**Prerequisites**: You need to create your own Google OAuth credentials. See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for detailed instructions.

1. **Configure Blogger Blog ID**:
   - Open VS Code Settings
   - Search for "Live Blog Writer"
   - Set **Platform** to "blogger"
   - Set **Blogger Blog ID** to your blog's ID

2. **Set OAuth Credentials**:
   - Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
   - Run: "Live Blog Writer: Set Blogger Credentials"
   - Paste your Client ID from Google Cloud Console
   - Paste your Client Secret

3. **Authenticate with Google**:
   - Open Command Palette
   - Run: "Live Blog Writer: Authenticate with Blogger"
   - Sign in with your Google account
   - Grant permission to manage your Blogger posts
   - VS Code will securely store your authentication session

### Publishing Posts

1. Create a new post: "Live Blog Writer: New Blog Post"
2. Write your content
3. Publish: "Live Blog Writer: Publish Post"

The extension will automatically:
- Check for a valid Google authentication session
- Request authentication if needed (prompts user to sign in)
- Use the OAuth token to publish to Blogger

## Technical Details

### OAuth 2.0 Scope

The extension requests the following Google OAuth scope:
- `https://www.googleapis.com/auth/blogger` - Full access to manage Blogger posts

### Custom OAuth 2.0 Implementation

The extension implements a custom OAuth 2.0 flow using Google's OAuth endpoints:

```typescript
const googleOAuthService = new GoogleOAuthService(context);
const accessToken = await googleOAuthService.authenticate();
```

**How it works:**

1. Opens a local HTTP server on `localhost:54321` to receive the OAuth callback
2. Opens your browser to Google's authorization page
3. After you grant permission, Google redirects to the local server with an authorization code
4. Exchanges the authorization code for access and refresh tokens
5. Stores tokens securely in VS Code's Secret Storage
6. Automatically refreshes tokens when they expire

This provides several benefits:

- **Works in development**: No need for the extension to be published in marketplace
- **Secure**: All tokens stored in VS Code's encrypted Secret Storage
- **No client secrets needed**: Uses a public OAuth client ID
- **Persistent**: Refresh tokens allow long-term access without re-authentication
- **User-friendly**: Standard Google sign-in flow that users are familiar with

### API Requests

All Blogger API requests now include the OAuth token in the Authorization header:
```typescript
headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
}
```

## Troubleshooting

### "The caller does not have permission" Error

This error occurs when:

- Not authenticated with Google
- Authentication token has expired

**Solution**: Run "Live Blog Writer: Authenticate with Blogger" command

### "Failed to authenticate with Google" Error

This might occur if:

- User cancels the authentication flow
- Network connectivity issues

**Solution**: Try again, ensure stable internet connection

### Authentication Session Expired

VS Code automatically handles token refresh, but if issues persist:

1. Sign out of Google in VS Code: Open Accounts in the bottom-left
2. Remove the Google account
3. Run "Live Blog Writer: Authenticate with Blogger" again

## Why OAuth Instead of API Keys?

| Operation | API Key | OAuth 2.0 |
|-----------|---------|-----------|
| List posts (read) | ✅ Works | ✅ Works |
| Create posts (write) | ❌ Permission denied | ✅ Works |
| Update posts (write) | ❌ Permission denied | ✅ Works |
| Delete posts (write) | ❌ Permission denied | ✅ Works |

**Blogger API requires OAuth 2.0 for all write operations** to ensure that only authenticated users can modify blog content.
