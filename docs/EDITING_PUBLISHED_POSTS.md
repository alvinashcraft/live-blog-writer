# Editing Published Posts

Live Blog Writer now supports editing posts that have already been published to your blog. This feature allows you to fetch existing posts from your blog, make changes, and republish them seamlessly.

## How to Edit a Published Post

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
1. Type "Live Blog Writer: Edit Published Post" and press Enter
1. Select the blog you want to edit posts from
1. The extension will fetch the 10 most recently published posts from that blog
1. Select the post you want to edit from the list
1. The post will open in the blog editor with all content and metadata
1. Make your changes
1. Click "Publish Post" to update the published post

## Edit-in-Progress Indicator

When you start editing a published post, the extension creates a local draft marked as an "edit draft." If you return to edit the same post later:

1. The post will show an edit icon `$(edit)` in the post selection list
1. The description will show "(Edit in progress)"
1. Selecting this post will resume your edit session

This prevents accidentally creating a duplicate draft when you want to continue editing.

## Supported Platforms

The edit published posts feature is supported on the following platforms:

### WordPress

1. Fetches published posts using the WordPress REST API
1. Updates the post using `PUT /wp-json/wp/v2/posts/{id}`
1. Preserves post ID, publish date, and other metadata
1. Supports updating title, content, excerpt, tags, and categories

### Blogger

1. Fetches published posts using Google Blogger API v3
1. Updates posts using the Blogger API `PUT /blogs/{blogId}/posts/{postId}`
1. Requires Google OAuth authentication
1. Preserves labels (tags/categories) and publish date

### Ghost

1. Fetches published posts using Ghost Admin API
1. Updates posts using the Ghost Admin API
1. Requires the `updated_at` timestamp from the current post
1. Supports updating title, content, tags, excerpt, and status
1. Preserves post slug and other Ghost-specific metadata

### Dev.to

1. Fetches published articles using Dev.to API
1. Updates articles using `PUT /api/articles/{id}`
1. Requires Dev.to API key
1. **Note:** Dev.to only accepts Markdown content
1. Supports updating title, content, tags, and description

### Substack

1. Fetches published posts using Substack API
1. **Note:** Substack does not support updating published posts via their API
1. You can fetch and view published posts, but updates are not currently supported

## Workflow

### First Time Editing

1. Command: "Edit Published Post"
1. Select your blog
1. Select a post from the list
1. The post content is fetched and loaded into the editor
1. Make your changes
1. The extension automatically saves a local draft with `isEditDraft: true`
1. Click "Publish Post" to update the live post

### Continuing an Edit

1. Command: "Edit Published Post"
1. Select your blog
1. Posts with local edits show `$(edit)` icon and "(Edit in progress)"
1. Select the post to resume editing
1. Continue making changes
1. Click "Publish Post" to update the live post

### Starting Fresh

If you have a local edit draft but want to start fresh:

1. Use "Live Blog Writer: Manage Drafts"
1. Delete the edit draft
1. Use "Edit Published Post" again to fetch the latest version from your blog

## Limitations

1. **Substack:** Does not support updating published posts via API. You can fetch posts for viewing but cannot republish changes.

1. **Tags and Categories:** 
   - WordPress requires mapping tag/category names to IDs. The current implementation uses simplified handling.
   - Full tag/category management will be improved in future versions.

1. **Images:** 
   - Image updates are supported if using external URLs
   - Uploading new images must be handled separately

1. **Draft vs. Published:** 
   - The extension fetches only published posts (status: "publish" or "live")
   - To edit draft posts, use the existing "Manage Drafts" feature for local drafts

1. **Post Limit:** 
   - Currently fetches the 10 most recent published posts
   - To edit older posts, you may need to adjust the post limit or search functionality (planned for future versions)

## Troubleshooting

### "No published posts found on this blog"

1. Ensure your blog has published posts (not just drafts)
1. Check that your credentials are correct
1. Verify the blog platform API is accessible

### "Failed to fetch posts"

1. Check your internet connection
1. Verify API credentials are configured correctly
1. Check if the blog platform's API is experiencing issues
1. For WordPress: Ensure REST API is enabled
1. For Blogger: Ensure you're authenticated with Google
1. For Ghost: Verify your Admin API key is valid

### Edit not saving

1. Check that you have "Publish Post" permission
1. Verify your credentials haven't expired
1. For Ghost: Ensure the post hasn't been modified on the server (this would cause a version conflict)

### Duplicate posts created

This shouldn't happen if using the edit feature correctly. If it does:

1. The extension tracks `publishedPostId` and `isEditDraft` to prevent duplicates
1. If you see duplicates, there may be a bug - please report it
1. As a workaround, delete the duplicate post from your blog's admin panel

## Tips

1. **Auto-save:** The extension auto-saves every 30 seconds, so your edits are preserved even if you close VS Code.

1. **Preview before publishing:** There's no preview feature yet, so review your changes carefully in the editor before publishing.

1. **Multiple edits:** You can edit posts from different blogs simultaneously. Each edit creates a separate local draft.

1. **Version control:** Consider copying important posts to a separate file for version control before making major edits.

## Future Enhancements

Planned improvements for the edit feature:

1. Search and filter published posts
1. Fetch more than 10 posts (pagination)
1. Side-by-side diff view showing changes before publishing
1. Better support for featured images
1. Full tag/category ID management for WordPress
1. Support for custom post types
1. Edit scheduling (modify scheduled posts)

## Feedback

If you encounter issues or have suggestions for improving the edit feature, please:

1. Report bugs on [GitHub Issues](https://github.com/alvinashcraft/live-blog-writer/issues)
1. Include the platform you're using (WordPress, Blogger, Ghost, Dev.to)
1. Provide error messages and steps to reproduce
1. Suggest enhancements or workflow improvements

Thank you for using Live Blog Writer!
