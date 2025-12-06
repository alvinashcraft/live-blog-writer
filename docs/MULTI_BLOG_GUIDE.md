# Multi-Blog Platform Support Guide

The Live Blog Writer extension now supports multiple blog platforms and allows you to configure multiple blogs of the same or different platforms.

## Supported Platforms

- **WordPress** - Self-hosted or WordPress.com blogs
- **Blogger** - Google's blogging platform
- **Medium** - Publishing platform
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
2. Run "Live Blog Writer: Manage Blog Configurations"
3. Select "Add New Blog Configuration"
4. Follow the prompts:
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
2. Add blog configuration and enter the application password when prompted
3. Alternatively, use "Set WordPress Password" command later

### Blogger

**Required Information:**

- Blog ID (found in your Blogger dashboard URL)

**Setup Steps:**

1. Get your Blog ID from Blogger:
   - Go to your Blogger dashboard
   - The Blog ID is in the URL: `blogger.com/blog/posts/{BLOG_ID}`
2. Add blog configuration with the Blog ID
3. Authenticate with Google using "Authenticate with Blogger" command

### Medium

**Required Information:**

- Integration Token
- Username (optional)

**Setup Steps:**

1. Generate an Integration Token:
   - Go to <https://medium.com/me/settings/security>
   - Scroll to "Integration tokens"
   - Create a new token
   - Copy the token
2. Add blog configuration
3. Set the integration token using "Set Medium Integration Token" command

**Important Notes:**

- Medium API allows up to 5 tags per post
- `publishStatus` options: `draft`, `public`, or `unlisted`
- Posts are published in HTML format

### Ghost

**Required Information:**

- Site URL (e.g., `https://yourblog.ghost.io`)
- Admin API Key

**Setup Steps:**

1. Generate an Admin API Key:
   - Go to Ghost Admin → Settings → Integrations
   - Create a new custom integration
   - Copy the Admin API Key (format: `id:secret`)
2. Add blog configuration with your site URL
3. Set the API key using "Set Ghost API Key" command

**Important Notes:**

- Content is converted to Ghost's Mobiledoc format
- Status options: `draft`, `published`, or `scheduled`

### Substack

**Required Information:**

- Hostname (e.g., `yoursite.substack.com`)
- Authentication credentials (choose one method):
  - **Email & Password** (Recommended - more stable)
  - **Connect SID cookie** (Alternative)
- Username (optional)

**Setup Steps:**

#### Option 1: Email & Password Authentication (Recommended)

1. Add blog configuration with your hostname
2. Run "Set Substack API Key" command
3. Choose "Email & Password" authentication method
4. Enter your Substack email and password

#### Option 2: Cookie-Based Authentication

1. Get your Connect SID cookie:
   - Log in to your Substack account
   - Open browser Developer Tools (F12)
   - Go to Application → Cookies → <https://substack.com>
   - Find and copy the `connect.sid` cookie value
2. Add blog configuration with your hostname
3. Run "Set Substack API Key" command
4. Choose "Cookie (connect.sid)" authentication method
5. Enter the cookie value

**Important Notes:**

- Email/password authentication is more reliable and doesn't expire as frequently
- Cookie-based authentication may require periodic refresh when the cookie expires
- Content is converted to Substack's structured ProseMirror document format
- Posts can be saved as drafts or published immediately
- Uses Substack's draft → prepublish → publish workflow for published posts

## Using Multiple Blogs

### Blog Selection in Editor

When creating a new post:

1. Open the blog editor with "New Blog Post" command
2. In the left panel, select your target blog from the "Selected Blog" dropdown
3. The dropdown shows all configured blogs with their platform type
4. Write your post and publish

### Publishing

When you click "Publish Post":

- If you've selected a blog in the dropdown, it will publish to that blog
- If no blog is selected, you'll be prompted to choose one
- The extension remembers your selection for the current post

## Migration from Legacy Settings

If you were using the extension before multi-blog support:

1. Run "Manage Blog Configurations"
2. Select "Migrate Legacy Settings"
3. Your old WordPress/Blogger settings will be converted to the new format
4. Old settings remain in place for compatibility

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
- **Set Medium Integration Token** - Set token for a Medium blog
- **Set Ghost API Key** - Set API key for a Ghost blog
- **Set Substack API Key** - Set cookie for a Substack blog

### Blogger Commands

- **Authenticate with Blogger** - Sign in with Google for Blogger
- **Set Custom Blogger Credentials** - Use your own OAuth credentials (Advanced)

## Tips

1. **Multiple Blogs of Same Platform**: You can add multiple WordPress, Medium, or any platform blogs with different names
2. **Secure Storage**: All passwords, tokens, and API keys are stored securely in VS Code's secret storage
3. **Blog Names**: Use descriptive names like "Personal Blog", "Company Blog", "Dev Blog" to easily identify blogs
4. **Draft Saving**: Drafts are saved locally and work across all platforms
5. **Tags and Categories**: Different platforms handle these differently:
   - WordPress: Supports both tags and categories
   - Blogger: Combines them as labels
   - Medium: Combines them as tags (max 5)
   - Ghost: Combines them as tags
   - Substack: Uses subtitle field for excerpts

## Troubleshooting

### Authentication Issues

**Blogger:**

- Run "Authenticate with Blogger" command
- Make sure you're signed in to the correct Google account

**Medium:**

- Verify your integration token is still valid
- Check token permissions at <https://medium.com/me/settings/security>

**Ghost:**

- Ensure API key format is correct (`id:secret`)
- Verify your Ghost site URL is correct

**Substack:**

- Cookie may have expired - get a fresh `connect.sid` from browser
- Make sure you're logged in to Substack in your browser

### Publishing Errors

1. **Check Configuration**: Ensure all required fields are filled
2. **Verify Credentials**: Make sure passwords/tokens/keys are set correctly
3. **Test Connection**: Try accessing your blog in a browser
4. **Check Logs**: Open Developer Tools in VS Code (Help → Toggle Developer Tools) for detailed error messages

## API Limitations

- **Medium**: Rate limits apply, maximum 5 tags per post
- **Substack**: Cookie-based authentication may require periodic renewal
- **Ghost**: Requires Admin API key, not Content API key
- **Blogger**: Requires Google OAuth authentication
- **WordPress**: Requires application passwords (username/password not supported)

## Security Best Practices

1. Never share your API keys, tokens, or passwords
2. Use application-specific passwords when available
3. Regularly rotate your credentials
4. Store credentials only in VS Code's secure storage
5. For Blogger custom OAuth, use your own Google Cloud project

## Support

For issues or questions:

- GitHub Issues: <https://github.com/alvinashcraft/live-blog-writer/issues>
- Documentation: See the `docs/` folder for more detailed guides
