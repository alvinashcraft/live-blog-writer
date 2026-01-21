# Change Log

All notable changes to the "live-blog-writer" extension will be documented in this file.

## [1.2.0] - 2026-01-21

### ✨ Added

- **Edit Published Posts**: New feature to edit posts that have already been published
  - New command: "Live Blog Writer: Edit Published Post"
  - Fetches 10 most recent published posts from selected blog
  - Shows edit-in-progress indicator for posts with local edits
  - Supports WordPress, Blogger, Ghost, and Dev.to (Substack read-only)
  - Seamless workflow: fetch post → edit → republish
  - Platform-specific update methods with proper validation

### 🔧 Changed

- Enhanced all service APIs with `getPosts()` and `getPost()` methods
- Standardized `updatePost()` methods across all platforms
- Improved error messages and validation throughout
- Added platform-specific ID type conversion for consistency

### 📚 Documentation

- Added comprehensive guide: `docs/EDITING_PUBLISHED_POSTS.md`
- Updated README with edit feature description and usage
- Updated roadmap and known limitations

## [1.1.0] - 2025-12-14

### ✨ Added

- **Markdown Editor (EasyMDE)**: New Markdown editing mode alongside the existing HTML (TinyMCE) editor
  - Content format selector (HTML / Markdown)
  - Drafts persist the selected content format
- **Dev.to Platform Support**: Publish Markdown posts to Dev.to
  - Dev.to API key support stored securely via VS Code Secret Storage
  - New command: "Live Blog Writer: Set Dev.to API Key"

### 🔧 Changed

- **Markdown Publishing to HTML Platforms**: When writing in Markdown, the extension converts Markdown → HTML at publish time for WordPress, Blogger, Ghost, and Substack

### 📚 Documentation

- Added docs for Markdown editor usage and Dev.to setup
- Updated root README with the new platform and editor mode

## [1.0.0] - 2025-12-07

### 🎉 Major Release - Production Ready

First stable release with verified publishing support for all four platforms: WordPress, Blogger, Ghost, and Substack.

### ✨ Added

- **Visual Blog Connections Manager**: New webview interface for managing all blog configurations
  - Card-based UI showing all configured blogs
  - Status indicators for credential configuration
  - One-click default blog selection
  - Direct authentication for Blogger OAuth
  - Connection testing functionality
  - Easy credential management per blog
- **Ghost Platform Support**: Full integration with Ghost blogging platform
  - Admin API key authentication
  - Draft and publish support
  - Tag and metadata support
- **Substack Platform Support**: Newsletter and blog publishing
  - Cookie-based authentication (recommended)
  - Email/password authentication (alternative)
  - Draft management
  - Structured content conversion
- **Multi-Blog Management**: Configure multiple blogs across different platforms
  - Support for multiple blogs of the same platform type
  - Blog selection dropdown in editor
  - Default blog configuration
  - Per-blog credential storage
- **Migration Tool**: Seamless migration from legacy single-blog settings
- **Enhanced Documentation**: Comprehensive guides for all platforms
  - Platform-specific setup guides
  - Multi-blog configuration guide
  - OAuth setup instructions for Blogger
  - Troubleshooting guides

### 🔧 Changed

- **Substack Authentication**: Cookie-based auth now recommended over email/password
  - Improved error messages for authentication failures
  - Added hostname sanitization (removes `https://` prefix)
  - Better guidance for extracting browser cookies
- **Blog Configuration**: New multi-blog system replaces legacy single-blog settings
  - Settings now stored in `liveBlogWriter.blogs` array
  - Legacy settings still supported with migration path
- **Markdown Documentation**: All docs now use consistent "1." notation for numbered lists
  - Added `.markdownlint.json` configuration
  - Added `.github/copilot-instructions.md` for formatting rules

### ❌ Removed

- **Medium Platform Support**: Removed due to API deprecation
  - Medium discontinued external publishing API
  - All Medium-related code, commands, and documentation removed
  - Migration path provided for existing Medium users

### 🐛 Fixed

- **Substack Hostname Handling**: Fixed `getaddrinfo ENOTFOUND` error
  - Automatically strips protocol prefixes from hostnames
  - Validates hostname format before API calls
- **Substack Authentication**: Improved error handling for 401/403 errors
  - Clear error messages directing users to cookie-based auth
  - Better documentation for authentication setup
- **Package.json**: Removed trailing comma causing lint errors

### 📚 Documentation

- Updated README.md with all four supported platforms
- Enhanced QUICKSTART.md with detailed setup steps
- Expanded MULTI_BLOG_GUIDE.md with platform-specific instructions
- Added BLOG_CONNECTIONS_UI.md for visual interface guide
- Updated all docs to reflect Medium removal
- Added Substack troubleshooting section

### ✅ Verified Platform Support

- ✅ WordPress: REST API publishing confirmed working
- ✅ Blogger: OAuth authentication and publishing confirmed working
- ✅ Ghost: Admin API integration confirmed working
- ✅ Substack: Cookie-based authentication and publishing confirmed working

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
