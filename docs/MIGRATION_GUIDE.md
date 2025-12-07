# Migration Guide: Single Blog to Multi-Blog Configuration

This guide helps existing Live Blog Writer users migrate from the single-blog configuration to the new multi-blog system.

## What Changed?

### Old Configuration (Deprecated)

```json
{
  "liveBlogWriter.platform": "wordpress",
  "liveBlogWriter.wordpress.url": "https://myblog.com",
  "liveBlogWriter.wordpress.username": "myusername",
  "liveBlogWriter.blogger.blogId": "123456789"
}
```

### New Configuration

```json
{
  "liveBlogWriter.blogs": [
    {
      "name": "My WordPress Blog",
      "platform": "wordpress",
      "id": "https://myblog.com",
      "username": "myusername"
    },
    {
      "name": "My Blogger Blog",
      "platform": "blogger",
      "id": "123456789"
    }
  ]
}
```

## Automatic Migration

The easiest way to migrate is using the built-in migration tool:

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
1. Run: **"Live Blog Writer: Manage Blog Configurations"**
1. Select: **"Migrate Legacy Settings"**
1. Your old settings will be automatically converted

The old settings will remain in place for compatibility, but you should use the new `blogs` array going forward.

## Manual Migration

If you prefer to migrate manually:

### WordPress Migration

1. Note your current settings:
   - `liveBlogWriter.wordpress.url`
   - `liveBlogWriter.wordpress.username`
1. Open Settings (JSON):
   - File → Preferences → Settings
   - Click the `{}` icon (top-right) to open JSON view
1. Add the new configuration:

   ```json
   "liveBlogWriter.blogs": [
     {
       "name": "https://myblog.com",  // Use your URL as the name
       "platform": "wordpress",
       "id": "https://myblog.com",    // Your WordPress URL
       "username": "myusername"       // Your WordPress username
     }
   ]
   ```

1. Your WordPress password is already stored securely and will work with the new system

### Blogger Migration

1. Note your current `liveBlogWriter.blogger.blogId`
1. Add to the blogs array:

   ```json
   "liveBlogWriter.blogs": [
     {
       "name": "123456789",      // Use your Blog ID as the name
       "platform": "blogger",
       "id": "123456789"         // Your Blogger Blog ID
     }
   ]
   ```

1. Your Blogger authentication will continue to work

## Adding More Blogs

Once migrated, you can add more blogs:

```json
"liveBlogWriter.blogs": [
  {
    "name": "Personal WordPress",
    "platform": "wordpress",
    "id": "https://personal.com",
    "username": "myusername"
  },
  {
    "name": "Company WordPress",
    "platform": "wordpress",
    "id": "https://company.com",
    "username": "companyuser"
  },
  {
    "name": "My Blogger",
    "platform": "blogger",
    "id": "123456789"
  },
  {
    "name": "Dev Blog (Medium)",
    "platform": "medium",
    "username": "@myhandle"
  }
]
```

## Setting Up New Platform Credentials

After migration, if you want to add new platforms:

### Medium

```bash
1. Add Medium blog to configuration
2. Run: "Live Blog Writer: Set Medium Integration Token"
3. Enter your Medium integration token
```

### Ghost

```bash
1. Add Ghost blog to configuration
2. Run: "Live Blog Writer: Set Ghost API Key"
3. Enter your Ghost Admin API key
```

### Substack

```bash
1. Add Substack blog to configuration
2. Run: "Live Blog Writer: Set Substack API Key"
3. Enter your Substack connect.sid cookie
```

## Verifying Migration

After migration:

1. Open a new blog post: **"Live Blog Writer: New Blog Post"**
1. Check the "Selected Blog" dropdown in the left panel
1. You should see your migrated blog(s) listed
1. Select a blog and try publishing a test post

## Troubleshooting

### Blog dropdown is empty

- Verify your `liveBlogWriter.blogs` array in settings
- Make sure each blog has required `name` and `platform` fields
- Reload VS Code window

### Can't publish to migrated blog

- **WordPress**: Make sure password is still set (may need to re-run "Set WordPress Password")
- **Blogger**: Re-authenticate if needed ("Authenticate with Blogger")

### Old settings still showing

- The old settings are deprecated but remain for compatibility
- The extension will use the new `blogs` array if it exists
- You can manually remove old settings after successful migration

## Benefits of New System

✅ **Multiple Blogs**: Add as many blogs as you want
✅ **Multiple Platforms**: Mix WordPress, Blogger, Medium, Ghost, and Substack
✅ **Better Organization**: Name your blogs descriptively
✅ **Easier Management**: GUI for adding/editing/removing blogs
✅ **More Secure**: Individual credential storage per blog

## Need Help?

- Check the [Multi-Blog Guide](MULTI_BLOG_GUIDE.md) for detailed platform setup
- Review the [Troubleshooting](#troubleshooting) section above
- Open an issue on [GitHub](https://github.com/alvinashcraft/live-blog-writer/issues)

## Rollback

If you need to rollback to single-blog mode:

1. The old settings still work if `blogs` array is empty
1. Remove the `blogs` array from settings
1. Keep using `platform`, `wordpress.url`, etc.
1. Note: New platforms (Medium, Ghost, Substack) require the new system
