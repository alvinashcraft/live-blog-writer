# Markdown Editor

Live Blog Writer supports two editing modes:

- **HTML**: TinyMCE-based editor that produces HTML
- **Markdown**: EasyMDE-based editor that produces Markdown

## Choosing a content format

In the Blog Editor panel, use the **Content format** dropdown:

- Select **HTML** to write in the existing WYSIWYG editor (TinyMCE)
- Select **Markdown** to write in the Markdown editor (EasyMDE)

The selected format is saved with your draft so reopening the draft restores the same editor.

## Publishing behavior

### Publishing Markdown to HTML-based platforms

WordPress, Blogger, Ghost, and Substack publishing flows are currently HTML-based.

When **Content format** is set to **Markdown** and you publish to one of those platforms, the extension converts your Markdown to HTML at publish time.

- Drafts continue to store your original Markdown
- The conversion happens only during publish (there is no on-the-fly conversion preview)

### Publishing to Dev.to

Dev.to publishing requires Markdown.

- Set **Content format** to **Markdown**
- The extension sends your content to Dev.to as `body_markdown`

## Notes and limitations

- EasyMDE is loaded from a CDN in the editor webview, so an internet connection is required the first time it loads.
- Markdown-to-HTML conversion is intended to be convenient, but some formatting may render slightly differently than it would in a native HTML workflow.
