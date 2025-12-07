# Multi-Blog Platform Support Guide

The Live Blog Writer extension now supports multiple blog platforms and allows you to configure multiple blogs of the same or different platforms.

## Supported Platforms

- **WordPress** - Self-hosted or WordPress.com blogs
- **Blogger** - Google's blogging platform
- **Ghost** - Open-source publishing platform
- **Substack** - Newsletter and blogging platform

## Configuration

### Managing Blog Configurations

Use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and run:

- **"Live Blog Writer: Manage Blog Configurations"**

This allows you to:

- Add new blog configurations
- Edit existing configurations
- Remove blog configurations
- Migrate legacy settings

### Adding a Blog

1. Open Command Palette
1. Run "Live Blog Writer: Manage Blog Configurations"
1. Select "Add New Blog Configuration"
1. Follow the prompts:
   - Enter a name for your blog (e.g., "My Personal Blog")
   - Select the platform
   - Enter platform-specific details (see below)

## Platform-Specific Setup

### WordPress

**Required Information:**

- Site URL (e.g., `https://example.com`)
- Username
- Application Password

**Setup Steps:**

1. Generate an Application Password in WordPress:
   - Go to Users → Profile → Application Passwords
   - Create a new application password
   - Copy the password (you won't be able to see it again)
1. Add blog configuration and enter the application password when prompted
1. Alternatively, use "Set WordPress Password" command later

### Blogger

**Required Information:**

- Blog ID (found in your Blogger dashboard URL)

**Setup Steps:**

1. Get your Blog ID from Blogger:
   - Go to your Blogger dashboard
   - The Blog ID is in the URL: `blogger.com/blog/posts/{BLOG_ID}`
1. Add blog configuration with the Blog ID
1. Authenticate with Google using "Authenticate with Blogger" command

### Ghost

**Required Information:**

- Site URL (e.g., `https://yourblog.ghost.io`)
- Admin API Key

**Setup Steps:**

1. Generate an Admin API Key:
   - Go to Ghost Admin → Settings → Integrations
   - Create a new custom integration
   - Copy the Admin API Key (format: `id:secret`)
1. Add blog configuration with your site URL
1. Set the API key using "Set Ghost API Key" command

**Important Notes:**

- Content is converted to Ghost's Mobiledoc format
- Status options: `draft`, `published`, or `scheduled`

### Substack

**Required Information:**

- Hostname without `https://` prefix (e.g., `yoursite.substack.com`)
- Authentication credentials (choose one method):
  - **Connect SID cookie** (Recommended - most reliable)
  - **Email & Password** (Alternative - may not work due to API restrictions)
- Username (optional)

**Setup Steps:**

#### Option 1: Cookie-Based Authentication (Recommended)

1. Get your Connect SID cookie:
   - Log in to your Substack account in your browser
   - Open browser Developer Tools (F12)
   - Go to Application (Chrome/Edge) or Storage (Firefox) → Cookies → <https://substack.com>
   - Find the `connect.sid` cookie
   - Copy the cookie value (leave "URL encoded" unchecked)
1. Add blog configuration with your hostname (without `https://`)
1. Run "Set Substack API Key" command
1. Choose "Cookie (connect.sid)" authentication method
1. Paste the cookie value

#### Option 2: Email & Password Authentication (Alternative)

1. Add blog configuration with your hostname
1. Run "Set Substack API Key" command
1. Choose "Email & Password" authentication method
1. Enter your Substack email and password
1. **Note**: This method may fail with 401 errors due to Substack API restrictions. Use cookie authentication if you encounter issues.

**Important Notes:**

- Cookie-based authentication is more reliable and works consistently
- Email/password authentication may be blocked by Substack's API security measures
- Cookie authentication may require periodic refresh when the cookie expires (typically every few weeks)
- Content is converted to Substack's structured ProseMirror document format
- Posts can be saved as drafts or published immediately
- Uses Substack's draft → prepublish → publish workflow for published posts

## Using Multiple Blogs

### Blog Selection in Editor

When creating a new post:

1. Open the blog editor with "New Blog Post" command
1. In the left panel, select your target blog from the "Selected Blog" dropdown
1. The dropdown shows all configured blogs with their platform type
1. Write your post and publish

### Publishing

When you click "Publish Post":

- If you've selected a blog in the dropdown, it will publish to that blog
- If no blog is selected, you'll be prompted to choose one
- The extension remembers your selection for the current post

## Migration from Legacy Settings

If you were using the extension before multi-blog support:

1. Run "Manage Blog Configurations"
1. Select "Migrate Legacy Settings"
1. Your old WordPress/Blogger settings will be converted to the new format
1. Old settings remain in place for compatibility

## Available Commands

### Core Commands

- **New Blog Post** - Create a new blog post
- **Publish Post** - Publish the current post to selected blog
- **Save Draft** - Save the current post locally
- **Open Recent Draft** - Open a recently saved draft
- **Manage Drafts** - View and manage all saved drafts

### Configuration Commands

- **Manage Blog Configurations** - Add, edit, or remove blog configurations
- **Set WordPress Password** - Set password for a WordPress blog
- **Set Ghost API Key** - Set API key for a Ghost blog
- **Set Substack API Key** - Set cookie for a Substack blog

### Blogger Commands

- **Authenticate with Blogger** - Sign in with Google for Blogger
- **Set Custom Blogger Credentials** - Use your own OAuth credentials (Advanced)

## Tips

1. **Multiple Blogs of Same Platform**: You can add multiple WordPress, Ghost, or any platform blogs with different names
1. **Secure Storage**: All passwords, tokens, and API keys are stored securely in VS Code's secret storage
1. **Blog Names**: Use descriptive names like "Personal Blog", "Company Blog", "Dev Blog" to easily identify blogs
1. **Draft Saving**: Drafts are saved locally and work across all platforms
1. **Tags and Categories**: Different platforms handle these differently:
   - WordPress: Supports both tags and categories
   - Blogger: Combines them as labels
   - Ghost: Combines them as tags
   - Substack: Uses subtitle field for excerpts

## Troubleshooting

### Authentication Issues

**Blogger:**

- Run "Authenticate with Blogger" command
- Make sure you're signed in to the correct Google account

**Ghost:**

- Ensure API key format is correct (`id:secret`)
- Verify your Ghost site URL is correct

**Substack:**

- Cookie may have expired - get a fresh `connect.sid` from browser
- Make sure you're logged in to Substack in your browser

### Publishing Errors

1. **Check Configuration**: Ensure all required fields are filled
1. **Verify Credentials**: Make sure passwords/tokens/keys are set correctly
1. **Test Connection**: Try accessing your blog in a browser
1. **Check Logs**: Open Developer Tools in VS Code (Help → Toggle Developer Tools) for detailed error messages

## API Limitations

- **Substack**: Cookie-based authentication may require periodic renewal
- **Ghost**: Requires Admin API key, not Content API key
- **Blogger**: Requires Google OAuth authentication
- **WordPress**: Requires application passwords (username/password not supported)

## Security Best Practices

1. Never share your API keys, tokens, or passwords
1. Use application-specific passwords when available
1. Regularly rotate your credentials
1. Store credentials only in VS Code's secure storage
1. For Blogger custom OAuth, use your own Google Cloud project

## Support

For issues or questions:

- GitHub Issues: <https://github.com/alvinashcraft/live-blog-writer/issues>
- Documentation: See the `docs/` folder for more detailed guides
