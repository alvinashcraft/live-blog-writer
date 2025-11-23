# Live Blog Writer

A VS Code extension for writing and publishing blog posts with a WYSIWYG editor. Supports WordPress and Blogger platforms through their REST APIs.

## Features

- **WYSIWYG Editing**: Rich text editor powered by TinyMCE with full formatting capabilities
- **Multi-Platform Support**: Publish to both WordPress and Blogger blogs
- **Metadata Management**: Easy-to-use left panel for managing post details:
  - Post title
  - Post status (Draft, Published, Pending Review, Private)
  - Publish date/time
  - Post excerpt
  - Tags
  - Categories
- **Auto-save**: Automatically saves your work every 30 seconds
- **Clean Interface**: Focused writing environment within VS Code

## Installation

1. Install the extension from the VS Code marketplace (coming soon)
2. Configure your blog credentials in VS Code settings

## Configuration

### WordPress Setup

1. Open VS Code Settings (File > Preferences > Settings)
2. Search for "Live Blog Writer"
3. Configure the following settings:
   - **Platform**: Select "wordpress"
   - **WordPress URL**: Your WordPress site URL (e.g., `https://example.com`)
   - **WordPress Username**: Your WordPress username

4. **Set WordPress Password Securely**:
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
   - Type "Live Blog Writer: Set WordPress Password" and press Enter
   - Enter your WordPress application password when prompted
   - The password will be stored securely in VS Code's Secret Storage

#### Creating a WordPress Application Password

1. Log in to your WordPress admin dashboard
2. Go to Users > Profile
3. Scroll down to "Application Passwords"
4. Enter a name (e.g., "VS Code Blog Writer") and click "Add New Application Password"
5. Copy the generated password and use it with the "Set WordPress Password" command

### Blogger Setup

1. **Configure VS Code Settings**:
   - Open VS Code Settings (File > Preferences > Settings)
   - Search for "Live Blog Writer"
   - Set **Platform** to "blogger"
   - Set **Blogger Blog ID** (found in your blog's settings or URL)

2. **Authenticate with Google**:
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
   - Run: "Live Blog Writer: Authenticate with Blogger"
   - Your browser will open to Google's sign-in page
   - Sign in with your Google account and grant permissions
   - Return to VS Code - you're ready to publish!

**Note**: The extension uses built-in OAuth credentials. Advanced users who want to use their own Google Cloud project can set custom credentials via "Live Blog Writer: Set Custom Blogger Credentials (Advanced)".

#### Finding Your Blogger Blog ID

1. Log in to your Blogger dashboard at [blogger.com](https://www.blogger.com)
2. Select your blog
3. Look at the URL - it will contain your Blog ID after `/blog/`
   - Example: `https://www.blogger.com/blog/posts/1234567890123456789`
   - The Blog ID is: `1234567890123456789`
4. Or go to Settings > Basic and find it in the "Blog ID" field

#### Important Notes for Blogger Authentication

- The authentication process temporarily uses port `54321` on localhost
- Make sure this port is not blocked by your firewall
- If you get a timeout error, ensure no other application is using this port
- Authentication credentials are stored securely and automatically refreshed

## Usage

### Creating a New Blog Post

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
2. Type "Live Blog Writer: New Blog Post" and press Enter
3. The blog editor will open in a new panel

### Writing Your Post

1. **Left Panel - Post Details**:
   - Enter your post title in the Title field
   - Select the post status (Draft, Published, etc.)
   - Optionally set a publish date/time
   - Add an excerpt (brief summary)
   - Add tags by typing and pressing Enter
   - Add categories by typing and pressing Enter

2. **Main Editor**:
   - Use the TinyMCE editor to write your content
   - Format text using the toolbar (bold, italic, lists, etc.)
   - Insert images, links, and other media

### Publishing Your Post

1. Click the "Save Draft" button to save your work locally
2. Click the "Publish Post" button to publish to your configured blog platform
3. Or use the Command Palette: "Live Blog Writer: Publish Post"

## Features in Detail

### WYSIWYG Editor

The extension uses TinyMCE, providing:
- Text formatting (bold, italic, underline, etc.)
- Headings and paragraphs
- Lists (ordered and unordered)
- Links and images
- Code blocks
- Tables
- And more...

### Metadata Panel

The left sidebar provides organized access to all post metadata:
- **Title**: Required field for your post title
- **Status**: Choose between Draft, Published, Pending Review, or Private
- **Publish Date**: Schedule posts for future publication
- **Excerpt**: Write a brief summary that appears in blog listings
- **Tags**: Add multiple tags (press Enter after each)
- **Categories**: Add multiple categories (press Enter after each)

### Auto-save

Your work is automatically saved every 30 seconds, preventing data loss.

## Requirements

- VS Code 1.85.0 or higher
- Active internet connection for publishing
- WordPress site with REST API enabled, or Blogger account

## Known Limitations

- Tags and categories in WordPress currently use simplified handling
  - Full tag/category ID mapping to be implemented in future versions
- Blogger combines tags and categories as "labels"
- Image uploads need to be handled separately (links to external images work)

## Troubleshooting

### "WordPress configuration is incomplete"

Make sure you have set:
- WordPress URL (without trailing slash)
- WordPress username
- WordPress password using the "Live Blog Writer: Set WordPress Password" command

### "WordPress password not set"

Run the command:
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Live Blog Writer: Set WordPress Password"
3. Enter your WordPress application password (not your regular password)

### "OAuth credentials not configured"

This means the extension's OAuth credentials are not properly set up. This typically only happens if you're building from source. For regular users, the extension includes built-in credentials.

**For Developers**: If you're building from source, see [`OAUTH_CREDENTIALS_SETUP.md`](docs/OAUTH_CREDENTIALS_SETUP.md) for complete setup instructions including Azure Key Vault integration.

### "Access blocked: authorization error" or "Error 401: invalid_client"

If you're using custom credentials:
- Verify the Blogger API v3 is enabled in your Google Cloud project
- Check that the redirect URI `http://localhost:54321/callback` is added correctly
- Ensure you added yourself as a test user in the OAuth consent screen

See the [Google OAuth Setup Guide](docs/GOOGLE_OAUTH_SETUP.md) for detailed instructions.

### "Blogger configuration is incomplete"

Make sure you have set:

- Blogger Blog ID in settings
- Run "Live Blog Writer: Authenticate with Blogger" to authenticate

### "Google authentication is required"

Run the command:

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Live Blog Writer: Authenticate with Blogger"
3. Sign in with your Google account and grant permissions

### Posts not appearing

- Check that your post status is set correctly
- For WordPress, ensure your user has permission to create posts
- For Blogger, verify your API key has the correct permissions

## Development

### Building from Source

```bash
npm install
npm run compile
```

**Note for Production Builds**: To include OAuth credentials in the packaged extension, see [`OAUTH_CREDENTIALS_SETUP.md`](docs/OAUTH_CREDENTIALS_SETUP.md) for instructions on setting up Azure Key Vault integration.

### Running the Extension

1. Open the project in VS Code
2. Press F5 to start debugging
3. A new VS Code window will open with the extension loaded

### Running Tests

```bash
npm test
```

### Developer Documentation

- [`docs/OAUTH_CREDENTIALS_SETUP.md`](docs/OAUTH_CREDENTIALS_SETUP.md) - Complete guide for OAuth credential management with Azure Key Vault
- [`docs/GOOGLE_OAUTH_SETUP.md`](docs/GOOGLE_OAUTH_SETUP.md) - User-facing guide for setting up Google OAuth
- [`docs/BLOGGER_OAUTH_SETUP.md`](docs/BLOGGER_OAUTH_SETUP.md) - Technical documentation for Blogger OAuth implementation
- [`docs/QUICKSTART.md`](docs/QUICKSTART.md) - Quick start guide for new users
- [`.github/workflows/README.md`](.github/workflows/README.md) - GitHub Actions CI/CD setup

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] Support for featured images
- [ ] Direct image upload to blog platforms
- [ ] Support for custom post types
- [ ] Draft management (list and edit existing drafts)
- [ ] Post scheduling
- [ ] Additional blog platform support (Medium, Dev.to, etc.)
- [ ] Markdown support alongside WYSIWYG

## Support

For issues, questions, or suggestions, please visit the [GitHub repository](https://github.com/alvinashcraft/live-blog-writer).

