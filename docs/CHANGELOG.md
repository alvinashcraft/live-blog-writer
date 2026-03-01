# Change Log

All notable changes to the "live-blog-writer" extension will be documented in this file.

## [1.4.0] - 2026-03-01

### ✨ Added

- **Localization: German, Portuguese, Italian, French**: Four new languages added to the extension
  - German (de) — `package.nls.de.json` + `l10n/bundle.l10n.de.json`
  - Portuguese (pt) — `package.nls.pt.json` + `l10n/bundle.l10n.pt.json`
  - Italian (it) — `package.nls.it.json` + `l10n/bundle.l10n.it.json`
  - French (fr) — `package.nls.fr.json` + `l10n/bundle.l10n.fr.json`
  - Extension now supports 6 languages total (English, Spanish, German, Portuguese, Italian, French)

### 🔧 Changed

- **Improved localization coverage**: Localized previously hardcoded webview UI strings
  - Blog Editor panel: labels, buttons, hints, and status options now localized
  - Blog Connections panel: headings, form labels, buttons, messages, and platform field labels now localized
  - Webview inline JavaScript strings now localized via injected constants
  - "Last modified:" prefix in draft listings now localized
- Updated marketplace keywords to include new language names

### 📚 Documentation

- Updated README.md with all 6 supported languages
- Updated roadmap to reflect completed language translations
- Added localization contribution guide to CONTRIBUTING.md
- Updated CHANGELOG.md with v1.4.0 release notes

## [1.3.0] - 2026-02-07

### ✨ Added

- **Localization Support (English + Spanish)**: Full internationalization infrastructure
  - All commands, settings, and UI strings are now localizable
  - Spanish (es) translation included out of the box
  - Uses VS Code's native l10n API for source code strings
  - `package.nls.json` / `package.nls.es.json` for package manifest strings
  - `l10n/bundle.l10n.es.json` for runtime strings
  - Ready for additional languages via community contributions
- **Keyboard Shortcuts**: Three new keybindings for common workflows
  - `Ctrl+Alt+N` / `Cmd+Alt+N` — New Blog Post
  - `Ctrl+Alt+S` / `Cmd+Alt+S` — Save Draft
  - `Ctrl+Alt+P` / `Cmd+Alt+P` — Publish Post
- **Post Templates**: Save and reuse post templates
  - New command: "Live Blog Writer: Save as Template" — captures current editor content as a reusable template
  - New command: "Live Blog Writer: New Post from Template" — create a new post pre-populated from a saved template
  - Templates stored locally in `Documents/LiveBlogWriter/Templates/`
  - Template metadata index for quick listing

### 🔧 Changed

- Commands now use `category` + `title` format (e.g., "Live Blog Writer: New Blog Post" appears as category "Live Blog Writer", title "New Blog Post" in the Command Palette)
- Improved marketplace listing with additional keywords and updated description
- Updated documentation with new features and keyboard shortcuts

### 📚 Documentation

- Updated README.md with localization, keybinding, and template feature documentation
- Added CHANGELOG.md to project root for VS Code Marketplace visibility
- Updated docs/CHANGELOG.md with v1.3.0 release notes
- Updated roadmap to reflect completed features

## [1.2.0] - 2026-01-22

### ✨ Added

- **Edit Published Posts**: New feature to edit posts that have already been published
  - New command: "Live Blog Writer: Edit Published Post"
  - "Load Published Post" button in the blog editor toolbar
  - Webview-based post selector popup with blog dropdown and post list
  - Fetches 10 most recent published posts from selected blog
  - Supports WordPress, Blogger, Ghost, and Dev.to (Substack read-only)
  - Seamless workflow: fetch post → edit → republish
  - "View Post" button in success message to open updated post in browser
  - WordPress: Fetches and preserves tag and category names

### 🔧 Changed

- Enhanced all service APIs with `getPosts()` and `getPost()` methods
- Added `getTagNames()` and `getCategoryNames()` methods to WordPressService
- Standardized `updatePost()` methods across all platforms
- Improved error messages and validation throughout
- Added platform-specific ID type conversion for consistency

### 📚 Documentation

- Added comprehensive guide: `docs/EDITING_PUBLISHED_POSTS.md`
- Added implementation summary: `docs/EDIT_FEATURE_SUMMARY.md`
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
