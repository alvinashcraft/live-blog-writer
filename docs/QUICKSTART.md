# Quick Start Guide

Get started with Live Blog Writer in minutes!

## Step 1: Install the Extension

1. Open VS Code
1. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X on Mac)
1. Search for "Live Blog Writer"
1. Click Install

## Step 2: Configure Your Blog

The extension supports multiple blogs from WordPress, Blogger, Ghost, and Substack. Use the visual blog management interface to set up your blogs.

1. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
1. Type: `Live Blog Writer: Manage Blog Connections`
1. Click **"Add New Blog"** button
1. Fill in the form:
   - **Blog Name**: A friendly name (e.g., "My WordPress Blog")
   - **Platform**: Select from WordPress, Blogger, Ghost, or Substack
   - **Platform-specific fields**: (see below for each platform)
1. Click **"Set Credential"** to securely store your authentication
1. Click **"Test Connection"** to verify your setup
1. Optionally, click **"Set Default"** to make this your default blog

### Platform-Specific Setup

#### WordPress

- **WordPress URL**: `https://yourblog.com` (your WordPress site URL)
- **Username**: Your WordPress username
- **Credential**: Application password (see below)

**Creating WordPress Application Password:**

1. Log into your WordPress admin
1. Go to Users > Profile
1. Scroll to "Application Passwords"
1. Name it "VS Code" and click "Add New"
1. Copy the password (you'll only see it once!)

#### Blogger

- **Blog ID**: Your Blogger blog ID (see below)
- **Credential**: OAuth 2.0 (handled automatically)

**Finding Your Blogger Blog ID:**

Your blog ID is in your Blogger dashboard URL:

```console
https://www.blogger.com/blog/posts/YOUR_BLOG_ID
                                    ^^^^^^^^^^^^
```

**Authenticating with Blogger:**

1. Run: `Live Blog Writer: Authenticate with Blogger`
1. Sign in with your Google account
1. Grant permissions

See [Google OAuth Setup Guide](GOOGLE_OAUTH_SETUP.md) for detailed OAuth configuration.

#### Ghost

- **Site URL**: Your Ghost site URL (e.g., `https://myblog.com`)
- **Credential**: Admin API Key in format `id:secret` (get from Ghost Admin → Integrations)

#### Substack

- **Hostname**: Your Substack hostname without `https://` (e.g., `myblog.substack.com`)
- **Username**: Your Substack username (optional)
- **Credential**: Connect.sid cookie (recommended) or email/password
- **Setup**: Run "Live Blog Writer: Set Substack API Key" command
  1. Choose "Cookie (connect.sid)" method (recommended)
  1. Get cookie: Open browser DevTools (F12) → Application/Storage → Cookies → substack.com → copy `connect.sid` value
  1. Paste cookie value when prompted

## Step 3: Write Your First Post

1. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
1. Type: `Live Blog Writer: New Blog Post`
1. Press Enter

The blog editor opens with:

- **Left Panel**: Post metadata (title, tags, etc.)
- **Right Panel**: Rich text editor

## Step 4: Add Post Details

In the left panel:

1. **Title**: Enter your post title (required)
1. **Blog**: Select which blog to publish to (if you have multiple configured)
1. **Status**: Choose Draft or Published
1. **Publish Date**: Leave empty for "now" or schedule for later
1. **Excerpt**: Write a brief summary
1. **Tags**: Type a tag and press Enter (repeat for multiple tags)
1. **Categories**: Type a category and press Enter (WordPress/Blogger only)

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
1. Or use Command Palette: `Live Blog Writer: Publish Post`
1. Wait for confirmation message

Done! Your post is live on your blog! 🎉

## Tips

- **Multiple Blogs**: You can configure multiple blogs of any platform and switch between them
- **Draft Management**: Access saved drafts via `Live Blog Writer: Manage Drafts`
- **Auto-save**: Your work saves automatically every 30 seconds
- **Tags**: Add as many as you want - just press Enter after each
- **Categories**: Available for WordPress and Blogger - type and press Enter
- **Images**: Use external image URLs in the editor
- **Formatting**: Explore the toolbar - there are lots of options!
- **Default Blog**: Set a default blog so you don't have to select it every time

## Keyboard Shortcuts

While writing:

- `Ctrl+B` / `Cmd+B`: Bold
- `Ctrl+I` / `Cmd+I`: Italic
- `Ctrl+U` / `Cmd+U`: Underline
- `Ctrl+K` / `Cmd+K`: Insert link

## Troubleshooting

### "No blog configuration found"

→ Use `Live Blog Writer: Manage Blog Connections` to add a blog

### Post not appearing on blog

→ Check your post status (Draft vs Published)
→ Verify your credentials are correct
→ Click "Test Connection" in blog management to verify

### Can't see the editor

→ Try: Command Palette > `Live Blog Writer: New Blog Post`

### Authentication issues with Blogger

→ See the [Google OAuth Setup Guide](GOOGLE_OAUTH_SETUP.md) for detailed instructions

### Need help?

→ Check the [README](../README.md) for full documentation
→ See [Multi-Blog Guide](MULTI_BLOG_GUIDE.md) for advanced blog management
→ Open an issue on [GitHub](https://github.com/alvinashcraft/live-blog-writer)

## What's Next?

- Add multiple blogs from different platforms
- Try different formatting options
- Experiment with tags and categories
- Use draft management to save work in progress
- Schedule posts for future publication
- Explore the [full documentation](../README.md)
- Read the [Multi-Blog Guide](MULTI_BLOG_GUIDE.md) for advanced features

Happy blogging! ✍️
