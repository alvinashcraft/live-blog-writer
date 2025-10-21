# Quick Start Guide

Get started with Live Blog Writer in minutes!

## Step 1: Install the Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X on Mac)
3. Search for "Live Blog Writer"
4. Click Install

## Step 2: Configure Your Blog

### For WordPress:

1. Open Settings (File > Preferences > Settings)
2. Search for "Live Blog Writer"
3. Set:
   - **Platform**: `wordpress`
   - **WordPress URL**: `https://yourblog.com` (your WordPress site URL)
   - **WordPress Username**: Your WordPress username
   - **WordPress Application Password**: [Generate one here](#wordpress-application-password)

#### WordPress Application Password

1. Log into your WordPress admin
2. Go to Users > Profile
3. Scroll to "Application Passwords"
4. Name it "VS Code" and click "Add New"
5. Copy the password (you'll only see it once!)
6. Paste it into VS Code settings

### For Blogger:

1. Open Settings (File > Preferences > Settings)
2. Search for "Live Blog Writer"
3. Set:
   - **Platform**: `blogger`
   - **Blogger Blog ID**: Your blog ID (see below)
   - **Blogger API Key**: [Get your API key here](#blogger-api-key)

#### Finding Your Blogger Blog ID

Your blog ID is in your Blogger dashboard URL:
```
https://www.blogger.com/blog/posts/YOUR_BLOG_ID
                                    ^^^^^^^^^^^^
```

#### Blogger API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing)
3. Enable "Blogger API v3"
4. Go to "Credentials" > "Create Credentials" > "API Key"
5. Copy the API key
6. Paste it into VS Code settings

## Step 3: Write Your First Post

1. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
2. Type: `Live Blog Writer: New Blog Post`
3. Press Enter

The blog editor opens with:
- **Left Panel**: Post metadata (title, tags, etc.)
- **Right Panel**: Rich text editor

## Step 4: Add Post Details

In the left panel:

1. **Title**: Enter your post title (required)
2. **Status**: Choose Draft or Published
3. **Publish Date**: Leave empty for "now" or schedule for later
4. **Excerpt**: Write a brief summary
5. **Tags**: Type a tag and press Enter (repeat for multiple tags)
6. **Categories**: Type a category and press Enter

## Step 5: Write Your Content

In the main editor:
- Type your content
- Use the toolbar for formatting:
  - **Bold**, *italic*, lists, etc.
  - Insert links and images
  - Add headings and tables
- Your work auto-saves every 30 seconds

## Step 6: Publish

1. Click **"Publish Post"** button at the bottom
2. Or use Command Palette: `Live Blog Writer: Publish Post`
3. Wait for confirmation message

Done! Your post is live on your blog! 🎉

## Tips

- **Auto-save**: Your work saves automatically, but you can also click "Save Draft"
- **Tags**: Add as many as you want - just press Enter after each
- **Categories**: Same as tags - type and press Enter
- **Images**: Use external image URLs in the editor
- **Formatting**: Explore the toolbar - there are lots of options!

## Keyboard Shortcuts

While writing:
- `Ctrl+B` / `Cmd+B`: Bold
- `Ctrl+I` / `Cmd+I`: Italic
- `Ctrl+U` / `Cmd+U`: Underline
- `Ctrl+K` / `Cmd+K`: Insert link

## Troubleshooting

### "Configuration is incomplete"
→ Check your settings - make sure all required fields are filled

### Post not appearing on blog
→ Check your post status (Draft vs Published)
→ Verify your credentials are correct

### Can't see the editor
→ Try: Command Palette > `Live Blog Writer: New Blog Post`

### Need help?
→ Check the [README](README.md) for full documentation
→ Open an issue on [GitHub](https://github.com/alvinashcraft/live-blog-writer)

## What's Next?

- Try different formatting options
- Experiment with tags and categories
- Schedule posts for future publication
- Explore the [full documentation](README.md)

Happy blogging! ✍️
