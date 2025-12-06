# Blog Connections UI

## Overview

The Blog Connections UI provides a visual, user-friendly interface for managing all your blog configurations in one place. Instead of editing JSON settings or using sequential command prompts, you can now manage everything through an intuitive webview panel.

## Opening the UI

**Command Palette:**

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: "Live Blog Writer: Manage Blog Connections"
3. Press Enter

## Features

### Visual Dashboard

- **Card-based layout** - Each blog is displayed in its own card with all relevant information
- **Status indicators** - See at a glance which blogs have credentials configured
- **Default blog badge** - Clearly shows which blog is set as default
- **Platform identification** - Easy-to-see platform badges (WordPress, Blogger, etc.)

### Add New Blog

1. Click the **"+ Add Blog"** button
2. Fill in the form:
   - **Blog Name**: A friendly name (e.g., "My Personal Blog")
   - **Platform**: Select from WordPress, Blogger, Medium, Ghost, or Substack
   - **Platform-specific fields**: The form dynamically shows required fields based on platform
   - **Credential**: Optionally set the password/token now, or later
3. Click **Save**

### Edit Existing Blog

1. Click the **"Edit"** button on any blog card
2. Update any field (name, URL, username, etc.)
3. Click **Save**

**Note:** Credentials are set separately for security - use the "Set Credential" button

### Set/Update Credentials

1. Click **"Set Credential"** on any blog card
2. Enter the appropriate credential:
   - **WordPress**: Application password
   - **Medium**: Integration token
   - **Ghost**: Admin API key (format: `id:secret`)
   - **Substack**: API key or cookie
   - **Blogger**: OAuth (handled automatically)
3. Click **Save**

Credentials are stored securely in VS Code's secret storage.

### Set Default Blog

1. Click **"Set Default"** on any blog card
2. The blog will be marked as default and automatically selected when publishing
3. Click **"Unset Default"** to remove default status

### Test Connection

1. Click **"Test"** on any blog card
2. The system will verify:
   - Credentials are configured
   - Required fields are present
   - Configuration looks valid
3. Results are shown in a notification

### Delete Blog

1. Click **"Delete"** on any blog card
2. Confirm the deletion
3. The blog configuration is permanently removed

## Platform-Specific Requirements

### WordPress

- **Required**: Site URL, Username, Application Password
- **URL Format**: `https://yourblog.com`
- **Credential**: Application password (not regular password)

### Blogger

- **Required**: Blog ID
- **Authentication**: OAuth (handled automatically via separate command)
- **Find Blog ID**: In Blogger settings or URL

### Medium

- **Optional**: Username
- **Required Credential**: Integration token
- **Get Token**: Medium Settings → Integration tokens

### Ghost

- **Required**: Site URL, Admin API Key
- **URL Format**: `https://yourblog.com`
- **Key Format**: `id:secret` (from Ghost Admin → Integrations)

### Substack

- **Required**: Hostname
- **Optional**: Username
- **Hostname Format**: `yourblog.substack.com`
- **Credential**: API key or authentication cookie

## Benefits Over JSON Configuration

✅ **Visual feedback** - See all blogs at once with their status
✅ **Form validation** - Platform-specific fields and requirements
✅ **No syntax errors** - No risk of malformed JSON
✅ **Credential management** - Secure password handling
✅ **Connection testing** - Verify configurations before publishing
✅ **Default blog selection** - One-click default setting
✅ **Beginner-friendly** - No need to understand JSON structure

## Technical Details

### Credential Storage

All credentials are stored in VS Code's built-in secret storage using keys in the format:

```console
liveBlogWriter.{platform}.{blogName}.{credentialType}
```

This ensures:

- Secure, encrypted storage
- Separation between different blogs
- No credentials in settings files
- Platform-specific credential types

### Configuration Location

Blog configurations (names, URLs, IDs) are stored in VS Code settings:

- **User Settings**: `%APPDATA%\Code\User\settings.json` (Windows)
- **Workspace Settings**: `.vscode/settings.json` (if workspace-specific)

### Backward Compatibility

The UI works seamlessly with:

- Existing JSON configurations
- Legacy single-blog settings (migrated automatically)
- Command Palette operations
- All existing features

## Tips

1. **Start simple**: Add one blog, test it, then add more
2. **Use descriptive names**: "Work Blog", "Personal Blog", etc.
3. **Test after setup**: Use the Test button to verify configuration
4. **Set a default**: Saves time if you primarily use one blog
5. **Keep credentials updated**: If passwords change, update them here

## Troubleshooting

User receives **"No credentials configured"**

- Click "Set Credential" and enter your password/token

User receives **"Missing URL or username"**

- Click "Edit" and ensure all required fields are filled

User receives **"A blog with this name already exists"**

- Choose a unique name for each blog configuration

User receives **Test fails**

- Verify all required fields are present
- Check credentials are set correctly
- Ensure URLs have correct format (include https://)
