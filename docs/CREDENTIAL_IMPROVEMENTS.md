# Credential Management Improvements

## Overview

This document describes the improvements made to credential management commands to properly support multiple blog configurations of the same platform type.

## Changes Made

### 1. WordPress Password Command Enhancement

**Previous Behavior:**

- Stored password to a single global key (`WORDPRESS_PASSWORD_KEY`)
- Did not account for multiple WordPress blog configurations

**New Behavior:**

- Filters blog configurations to show only WordPress blogs
- Prompts user to select which WordPress blog when multiple exist
- Stores password with blog-specific secret key: `liveBlogWriter.wordpress.{blogName}.password`
- Shows warning if no WordPress blogs are configured

**User Experience:**

- Single WordPress blog: Direct password prompt
- Multiple WordPress blogs: Selection dropdown → password prompt
- Clear feedback with blog name in messages

### 2. Blogger OAuth Command

**Status:** No changes required

**Reason:**
Blogger OAuth is account-level authentication. One Google account can access multiple Blogger blogs, with blog-specific access controlled by the Blog ID in the configuration. The current implementation correctly handles this pattern.

### 3. Substack Authentication Major Upgrade

**Previous Implementation:**

- Only supported cookie-based authentication (`connect.sid`)
- Simple POST to `/api/v1/posts` endpoint
- Basic HTML content format
- Cookie expiration issues

**New Implementation:**

#### Dual Authentication Methods

#### Method 1: Email & Password (Recommended)

- More stable and reliable authentication
- Follows python-substack library approach
- Uses Substack's `/api/v1/login` endpoint
- Automatically manages session cookies
- Less frequent authentication failures

#### Method 2: Cookie-Based (Alternative)

- Uses `connect.sid` cookie from browser
- Useful for testing or when email/password isn't preferred
- May require periodic refresh

#### Enhanced API Integration

**Structured Content Format:**

```typescript
{
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: '...' }] },
    { type: 'heading', attrs: { level: 1 }, content: [...] }
  ]
}
```

**Proper Draft Workflow:**

1. Create draft via POST `/api/v1/drafts`
2. If publishing: Call GET `/api/v1/drafts/{id}/prepublish` for validation
3. Publish via POST `/api/v1/drafts/{id}/publish`

**HTML to Substack Conversion:**

- Converts HTML to Substack's ProseMirror-like document structure
- Preserves headings (h1, h2, h3) with proper levels
- Handles paragraphs and text content
- Extensible for future enhancement (images, links, formatting)

#### Authentication Flow

```typescript
// Email/Password
constructor({ email, password }, hostname)
→ login() on first API call
→ extract session cookies
→ use for subsequent requests

// Cookie-based
constructor({ connectSid }, hostname)
→ set cookie header immediately
→ use for all requests
```

#### Service Improvements

**Private Methods:**

- `login()`: Authenticate with email/password
- `getUserId()`: Retrieve and cache user ID (required for posts)
- `ensureAuthenticated()`: Ensure auth is complete before operations
- `htmlToSubstackBody()`: Convert HTML to structured format

**Public Methods:**

- `createPost()`: Enhanced with proper workflow
- `testConnection()`: Returns detailed profile info including auth method

### 4. Command Updates

**Set Substack Credentials Command:**

- Renamed from "Set Substack API Key" to "Set Substack Credentials"
- Interactive authentication method selection:
  - "Email & Password" (recommended)
  - "Cookie (connect.sid)" (alternative)
- Email/password path:
  - Email validation
  - Password input
  - Stores both securely
  - Clears any existing cookie
- Cookie path:
  - Cookie input
  - Stores securely
  - Clears any existing email/password
- Blog-specific secret keys:
  - `liveBlogWriter.substack.{blogName}.email`
  - `liveBlogWriter.substack.{blogName}.password`
  - `liveBlogWriter.substack.{blogName}.apikey` (for cookie)

### 5. Publish Function Updates

**WordPress:**

- Updated to use blog-specific secret key pattern

**Substack:**

- Checks for email/password credentials first (preferred)
- Falls back to cookie-based authentication
- Creates appropriate SubstackService instance
- Clear error messages indicating which credentials are missing

## Secret Key Pattern

All credentials now follow a consistent pattern:

```text
liveBlogWriter.{platform}.{blogName}.{credentialType}
```

**Examples:**

- `liveBlogWriter.wordpress.MyBlog.password`
- `liveBlogWriter.medium.TechBlog.token`
- `liveBlogWriter.ghost.PersonalBlog.apikey`
- `liveBlogWriter.substack.Newsletter.email`
- `liveBlogWriter.substack.Newsletter.password`
- `liveBlogWriter.substack.Newsletter.apikey`

## Benefits

### 1. Consistency

- All credential commands follow the same pattern
- Uniform user experience across platforms
- Predictable credential storage

### 2. Multi-Blog Support

- Proper isolation of credentials per blog
- Clear selection when multiple blogs exist
- No credential conflicts

### 3. Improved Reliability (Substack)

- Email/password authentication is more stable
- Proper API workflow reduces errors
- Better error messages with authentication hints
- Follows official python-substack patterns

### 4. Better User Experience

- Clear prompts and selections
- Informative success/error messages
- Blog names shown in all interactions
- Authentication method flexibility

## Migration Notes

Users with existing Substack cookie-based credentials can continue using them. The system will:

1. Check for email/password first
2. Fall back to cookie if email/password not found
3. Allow switching between methods via the credential command

No migration required for WordPress - the command will prompt for blog selection on next credential update.

## Technical Implementation

**Files Modified:**

1. `src/extension.ts`
   - Updated `setWordPressPasswordCommand`
   - Updated `setSubstackApiKeyCommand` (renamed functionality)
   - Updated `publishToSubstack()` helper
2. `src/services/SubstackService.ts`
   - Complete refactor to support dual authentication
   - Added structured content conversion
   - Implemented proper draft workflow
   - Added authentication management methods
3. `package.json`
   - Updated command title for Substack credentials
4. `docs/MULTI_BLOG_GUIDE.md`
   - Updated Substack section with both auth methods
   - Added setup instructions for each method
5. `README.md`
   - Updated Substack requirements

## Future Considerations

### Potential Enhancements

1. **Substack Content Conversion:**
   - Support for images and captions
   - Link formatting with marks
   - Bold/italic/underline text marks
   - Code blocks
   - Lists (ordered/unordered)
   - Embeds and widgets

2. **Authentication Token Refresh:**
   - Automatic token refresh for Substack
   - Detect expired cookies and prompt re-auth
   - Session management improvements

3. **Credential Testing:**
   - "Test Connection" button in blog configuration
   - Validate credentials before first publish
   - Show authentication status in UI

4. **Credential Migration Tool:**
   - Automatic migration from legacy single credentials
   - Batch credential setup for multiple blogs
   - Import/export credential configuration (securely)

## References

- [python-substack GitHub](https://github.com/ma2za/python-substack) - Inspiration for email/password authentication
- Substack API endpoints discovered through python-substack
- ProseMirror document structure for content format
