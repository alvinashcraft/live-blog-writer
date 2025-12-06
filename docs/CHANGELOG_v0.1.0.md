# Changelog - Multi-Platform Support Update

## Version 0.1.0 (Upcoming)

### 🎉 Major New Features

#### Multi-Platform Support
- **Medium Integration**: Publish directly to Medium using integration tokens
- **Ghost Support**: Full support for Ghost blogging platform with Admin API
- **Substack Integration**: Publish to Substack newsletters

#### Multiple Blog Configurations
- Configure and manage multiple blogs across all platforms
- Support for multiple blogs of the same platform (e.g., 2+ WordPress blogs)
- Easy-to-use configuration manager with GUI
- Blog selection dropdown in the editor

### ✨ New Features

#### Blog Management
- **Manage Blog Configurations** command for adding, editing, and removing blogs
- Descriptive names for each blog configuration
- Migration tool for legacy single-blog settings
- Per-blog credential management

#### Enhanced Editor
- Blog selection dropdown before title field
- Select target blog before or during writing
- Visual indication of configured blogs with platform type
- Remembers selected blog for current post

#### Secure Credential Storage
- Individual credential storage per blog
- Support for Medium integration tokens
- Support for Ghost Admin API keys
- Support for Substack session cookies
- Dedicated commands for setting credentials per platform

### 🔧 Configuration Changes

#### New Settings Schema
- `liveBlogWriter.blogs` - Array of blog configurations
  - Each entry contains: `name`, `platform`, `id`, `username`
  - Supports: `wordpress`, `blogger`, `medium`, `ghost`, `substack`

#### Deprecated Settings
- `liveBlogWriter.platform` - Use `blogs` array instead
- `liveBlogWriter.wordpress.url` - Use `blogs` array instead
- `liveBlogWriter.wordpress.username` - Use `blogs` array instead
- `liveBlogWriter.blogger.blogId` - Use `blogs` array instead

### 📦 Dependencies
- Added `substack-api` for Substack integration
- Updated `axios` for better HTTP handling across platforms

### 📚 Documentation
- New: Multi-Blog Platform Guide
- New: Migration Guide for existing users
- Updated: README with multi-platform information
- Platform-specific setup instructions

### 🆕 New Commands
- `Live Blog Writer: Manage Blog Configurations` - Central blog management
- `Live Blog Writer: Set Medium Integration Token` - Set Medium credentials
- `Live Blog Writer: Set Ghost API Key` - Set Ghost Admin API key
- `Live Blog Writer: Set Substack API Key` - Set Substack session cookie

### 🐛 Bug Fixes
- Improved error handling for authentication failures
- Better validation for blog configuration inputs
- Enhanced credential management across platforms

### 🔄 Migration Path
Existing users can:
1. Continue using legacy settings (backward compatible)
2. Use automated migration tool
3. Manually configure new blog array

Legacy configuration will continue to work but is deprecated.

### 🎯 Platform-Specific Notes

#### Medium
- Supports up to 5 tags per post
- Content published in HTML format
- Status options: `draft`, `public`, `unlisted`
- Requires integration token from Medium settings

#### Ghost
- Content converted to Mobiledoc format
- Status options: `draft`, `published`, `scheduled`
- Requires Admin API key (format: `id:secret`)
- Supports custom excerpts and featured images

#### Substack
- Cookie-based authentication
- Status options: draft or published
- Subtitle support for excerpts
- May require cookie refresh periodically

### 🔐 Security Improvements
- All credentials stored in VS Code Secret Storage
- Per-blog credential isolation
- No credentials stored in settings.json
- Secure token management across platforms

### 💡 Usage Tips
- Name your blogs descriptively (e.g., "Personal Blog", "Dev Blog")
- Use the blog selector in the editor for quick switching
- Configure multiple blogs of the same platform for different purposes
- Migrate legacy settings for better management

### 🚀 Performance
- Efficient credential retrieval
- Lazy loading of blog configurations
- Optimized service initialization

### 📋 Breaking Changes
None - fully backward compatible with legacy configuration

### 🔮 Future Enhancements
- Additional platform support
- Bulk operations across multiple blogs
- Cross-posting to multiple blogs simultaneously
- Enhanced draft management with platform-specific features

---

## Version 0.0.4 (Previous)
- WordPress and Blogger support
- WYSIWYG editor with TinyMCE
- Draft management
- Auto-save functionality
- Metadata management (tags, categories, excerpt)
