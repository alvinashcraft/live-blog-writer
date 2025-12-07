# Extension Demo

This document shows what the Live Blog Writer extension looks like and how it works.

## Opening the Blog Editor

1. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
1. Type: "Live Blog Writer: New Blog Post"
1. Press Enter

## The Blog Editor Interface

The editor has two main sections:

### Left Panel - Post Metadata

```console
┌─────────────────────────────────┐
│ Post Details                     │
│                                  │
│ Title *                          │
│ ┌─────────────────────────────┐ │
│ │ My Awesome Blog Post        │ │
│ └─────────────────────────────┘ │
│                                  │
│ Status                           │
│ ┌─────────────────────────────┐ │
│ │ Draft               ▼       │ │
│ └─────────────────────────────┘ │
│                                  │
│ Publish Date                     │
│ ┌─────────────────────────────┐ │
│ │ 2025-10-21 12:00 PM         │ │
│ └─────────────────────────────┘ │
│                                  │
│ Excerpt                          │
│ ┌─────────────────────────────┐ │
│ │ A brief summary...          │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                  │
│ Tags                             │
│ ┌─────────────────────────────┐ │
│ │ Add tag...                  │ │
│ └─────────────────────────────┘ │
│ [typescript ×] [vscode ×]        │
│                                  │
│ Categories                       │
│ ┌─────────────────────────────┐ │
│ │ Add category...             │ │
│ └─────────────────────────────┘ │
│ [tutorials ×] [development ×]    │
└─────────────────────────────────┘
```

### Right Panel - WYSIWYG Editor

```console
┌──────────────────────────────────────────────────┐
│ Blog Post Editor                                 │
├──────────────────────────────────────────────────┤
│ [Undo] [Redo] [Bold] [Italic] [Format ▼] ...   │
├──────────────────────────────────────────────────┤
│                                                   │
│ Welcome to my blog post!                         │
│                                                   │
│ Here's some **bold text** and *italic text*.    │
│                                                   │
│ - Bullet point 1                                 │
│ - Bullet point 2                                 │
│                                                   │
│ [Insert images, links, tables, etc.]            │
│                                                   │
│                                                   │
├──────────────────────────────────────────────────┤
│ [Save Draft] [Publish Post]                     │
└──────────────────────────────────────────────────┘
```

## Workflow Example

### 1. Create New Post

Command: `Live Blog Writer: New Blog Post`

### 2. Fill in Metadata (Left Panel)

- **Title**: "Getting Started with TypeScript"
- **Status**: Draft
- **Tags**: typescript, tutorial, beginners
- **Categories**: Programming, Web Development

### 3. Write Content (Right Panel)

Use the rich text editor to:

- Type your content
- Format with bold, italic, headings
- Add lists, links, images
- Insert code blocks, tables, etc.

### 4. Save Draft

Click "Save Draft" button to save locally

### 5. Publish

When ready:

1. Change status to "Published"
1. Click "Publish Post" button
1. Wait for confirmation: "Post published successfully!"

## Features in Action

### Adding Tags

1. Click in the "Tags" input field
1. Type a tag name (e.g., "javascript")
1. Press Enter
1. Tag appears as a badge below
1. Click × to remove a tag

### Adding Categories

Same process as tags:

1. Type category name
1. Press Enter
1. Appears as a badge
1. Click × to remove

### Formatting Text

- Select text in the editor
- Use toolbar buttons:
  - **B** for bold
  - *I* for italic
  - Format dropdown for headings
  - List buttons for bullets/numbers
  - Link button for hyperlinks

### Publishing Options

1. **Draft**: Save without publishing
1. **Published**: Publish immediately
1. **Pending Review**: Submit for review (WordPress)
1. **Private**: Visible only to you (WordPress)

### Scheduling Posts

1. Set "Publish Date" to a future date/time
1. Set status to "Published"
1. Click "Publish Post"
1. Post will go live at the scheduled time

## Configuration Settings

Access via: File > Preferences > Settings > Search "Live Blog Writer"

### WordPress Example

```json
{
  "liveBlogWriter.platform": "wordpress",
  "liveBlogWriter.wordpress.url": "https://myblog.com",
  "liveBlogWriter.wordpress.username": "admin"
}
```

### Blogger Example

```json
{
  "liveBlogWriter.platform": "blogger",
  "liveBlogWriter.blogger.blogId": "1234567890123456789",
  "liveBlogWriter.blogger.apiKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

## Commands Available

| Command | Description |
|---------|-------------|
| `Live Blog Writer: New Blog Post` | Opens the blog editor |
| `Live Blog Writer: Publish Post` | Publishes the current post |

## Auto-Save

- Saves every 30 seconds automatically
- Saves when you click "Save Draft"
- Saves before publishing

## Tips for Best Experience

1. **Keep it simple**: Focus on writing first, format later
1. **Use tags wisely**: 3-5 relevant tags work best
1. **Write good excerpts**: Help readers decide if they want to read more
1. **Save often**: Though auto-save is enabled, manual saves give peace of mind
1. **Test with drafts first**: Publish as draft, preview on your blog, then publish

## Troubleshooting Demo Scenarios

### Scenario 1: "Configuration incomplete"

**Problem**: Trying to publish without credentials
**Solution**:

1. Open Settings
1. Configure platform, URL, credentials
1. Try publishing again

### Scenario 2: Empty title

**Problem**: Trying to publish without a title
**Solution**: Fill in the Title field (it's required)

### Scenario 3: Connection error

**Problem**: Can't connect to blog platform
**Solution**:

1. Check internet connection
1. Verify blog URL is correct
1. Verify credentials are valid
1. Check if blog API is enabled

## Next Steps

After setting up:

1. Create your first test post as a draft
1. Preview it on your blog
1. Make edits as needed
1. Publish when ready
1. Share your content!

For full documentation, see [README.md](README.md)
