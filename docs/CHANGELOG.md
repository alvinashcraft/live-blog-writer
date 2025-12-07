# Change Log

All notable changes to the "live-blog-writer" extension will be documented in this file.

## [0.0.1] - 2025-10-21

### Added

- Initial release of Live Blog Writer extension
- WYSIWYG editor powered by TinyMCE with GPL license
- Support for WordPress publishing via REST API
- Support for Blogger publishing via REST API
- Left metadata panel for post details
  - Title field
  - Post status selector (Draft, Published, Pending Review, Private)
  - Publish date/time picker
  - Excerpt field
  - Tags management (add/remove tags)
  - Categories management (add/remove categories)
- Auto-save functionality (every 30 seconds)
- Four commands:
  - "Live Blog Writer: New Blog Post" - Create a new blog post
  - "Live Blog Writer: Publish Post" - Publish the current post
  - "Live Blog Writer: Set WordPress Password" - Securely store WordPress password
  - "Live Blog Writer: Set Blogger API Key" - Securely store Blogger API key
- Configuration settings for WordPress and Blogger
- Basic error handling and user feedback
- **Secure credential storage using VS Code Secret Storage**

### Features

- Rich text editing with full formatting support
- Clean, focused writing interface
- Separate metadata management panel
- Multi-platform publishing support
- **Secure credential handling via VS Code Secret Storage** (passwords/API keys never stored in plain text)

### Security

- Credentials stored in VS Code's Secret Storage instead of plain text settings
- WordPress application passwords and Blogger API keys are encrypted
- No sensitive data exposed in configuration files

### Known Issues

- WordPress tags and categories use simplified handling (no ID mapping yet)
- Image uploads must be handled externally (external image links work)
- No draft management interface (coming in future version)
