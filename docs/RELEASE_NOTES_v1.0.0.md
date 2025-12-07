# Release Notes - v1.0.0

## 🎉 Production Ready Release

We're excited to announce the first stable release of Live Blog Writer! This version has been thoroughly tested with all four supported platforms and is ready for production use.

## What's New

### Visual Blog Connections Manager

Manage all your blogs with an intuitive webview interface:

- **Card-based layout** showing all configured blogs at a glance
- **Status indicators** to see which blogs have credentials configured
- **One-click actions** for setting credentials, testing connections, and managing blogs
- **Default blog selection** for quick publishing
- **Direct OAuth authentication** for Blogger right from the interface

### Four Verified Platforms

All publishing platforms have been thoroughly tested and verified:

- ✅ **WordPress** - Self-hosted and WordPress.com blogs
- ✅ **Blogger** - Google's blogging platform with OAuth authentication
- ✅ **Ghost** - Modern publishing platform with Admin API
- ✅ **Substack** - Newsletter and blog publishing

### Multi-Blog Support

- Configure multiple blogs across different platforms
- Support multiple blogs of the same type (e.g., personal and work WordPress blogs)
- Easy blog selection from dropdown in the editor
- Set a default blog for quick publishing

### Enhanced Substack Support

Substack integration now uses cookie-based authentication for maximum reliability:

- Cookie-based authentication (recommended method)
- Automatic hostname sanitization
- Clear error messages and troubleshooting guidance
- Detailed setup documentation

## Important Changes

### Medium Support Removed

Medium has discontinued their external publishing API, so Medium support has been removed from this release. If you were using Medium:

1. Export your Medium drafts
1. Migrate to one of the four supported platforms
1. Update your blog configurations

### Recommended: Migrate to New Blog Configuration

If you're upgrading from an earlier version (0.0.x), we recommend migrating to the new multi-blog configuration system:

1. Run: **"Live Blog Writer: Manage Blog Connections"**
1. Click **"Migrate Legacy Settings"** if you have old configurations
1. Or manually add your blogs using the new visual interface

The old configuration format still works but is deprecated.

## Getting Started

1. **Install the extension** from the VS Code Marketplace
1. **Open the Blog Connections Manager**: Run "Live Blog Writer: Manage Blog Connections"
1. **Add your first blog**:
   - Click "+ Add Blog"
   - Select your platform (WordPress, Blogger, Ghost, or Substack)
   - Fill in your blog details
   - Set credentials using the platform-specific command
1. **Start writing**: Run "Live Blog Writer: New Blog Post"
1. **Publish**: Click "Publish Post" button or use the command palette

## Platform Setup Guides

For detailed setup instructions, see:

- [Quick Start Guide](QUICKSTART.md)
- [Multi-Blog Platform Guide](MULTI_BLOG_GUIDE.md)
- [Blog Connections UI Guide](BLOG_CONNECTIONS_UI.md)
- [Blogger OAuth Setup](BLOGGER_OAUTH_SETUP.md)

## What's Next

Future releases may include:

- Image upload support
- Enhanced tag/category management with ID mapping
- Draft management interface
- Post scheduling
- Additional platform support
- Template system for post layouts

## Feedback

Found a bug or have a feature request? Please [open an issue](https://github.com/alvinashcraft/live-blog-writer/issues) on GitHub.

Thank you for using Live Blog Writer! 🚀
