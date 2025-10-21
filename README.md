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

1. Open VS Code Settings (File > Preferences > Settings)
2. Search for "Live Blog Writer"
3. Configure the following settings:
   - **Platform**: Select "blogger"
   - **Blogger Blog ID**: Your Blogger blog ID (found in your blog's settings or URL)

4. **Set Blogger API Key Securely**:
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
   - Type "Live Blog Writer: Set Blogger API Key" and press Enter
   - Enter your Google API key when prompted
   - The API key will be stored securely in VS Code's Secret Storage

#### Getting Blogger API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Blogger API v3
4. Create credentials (API Key)
5. Copy the API key and use it with the "Set Blogger API Key" command

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

### "Blogger configuration is incomplete"

Make sure you have set:
- Blogger Blog ID in settings
- Blogger API Key using the "Live Blog Writer: Set Blogger API Key" command

### "Blogger API key not set"

Run the command:
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Live Blog Writer: Set Blogger API Key"
3. Enter your Blogger API key

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

### Running the Extension

1. Open the project in VS Code
2. Press F5 to start debugging
3. A new VS Code window will open with the extension loaded

### Running Tests

```bash
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See LICENSE file for details.

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

