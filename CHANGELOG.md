# Change Log

All notable changes to the "live-blog-writer" extension will be documented in this file.

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
- **Ghost Platform Support**: Full integration with Ghost blogging platform
- **Substack Platform Support**: Newsletter and blog publishing
- **Multi-Blog Management**: Configure multiple blogs across different platforms
- **Migration Tool**: Seamless migration from legacy single-blog settings
- **Enhanced Documentation**: Comprehensive guides for all platforms

### 🔧 Changed

- **Substack Authentication**: Cookie-based auth now recommended over email/password
- **Blog Configuration**: New multi-blog system replaces legacy single-blog settings
- **Markdown Documentation**: All docs now use consistent "1." notation for numbered lists

### ❌ Removed

- **Medium Platform Support**: Removed due to API deprecation

### 🐛 Fixed

- **Substack Hostname Handling**: Fixed `getaddrinfo ENOTFOUND` error
- **Substack Authentication**: Improved error handling for 401/403 errors
- **Package.json**: Removed trailing comma causing lint errors

## [0.0.1] - 2025-10-21

### Added

- Initial release of Live Blog Writer extension
- WYSIWYG editor powered by TinyMCE
- Support for WordPress and Blogger publishing
- Left metadata panel for post details
- Auto-save functionality (every 30 seconds)
- Secure credential storage using VS Code Secret Storage
