# Testing the Live Blog Writer Extension

## Prerequisites

1. VS Code 1.85.0 or later installed
1. Node.js and npm installed
1. A WordPress or Blogger blog for testing

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/alvinashcraft/live-blog-writer.git
   cd live-blog-writer
   ```

1. Install dependencies:

   ```bash
   npm install
   ```

1. Compile the extension:

   ```bash
   npm run compile
   ```

## Running the Extension

### Method 1: Using VS Code Debugger (Recommended)

1. Open the project in VS Code:

   ```bash
   code .
   ```

1. Press `F5` (or go to Run > Start Debugging)
1. A new VS Code window titled "Extension Development Host" will open
1. In this new window, test the extension

### Method 2: Using Command Line

```bash
npm run watch
```

Then open a new VS Code window and load the extension manually.

## Test Scenarios

### Test 1: Create New Blog Post

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
1. Type: "Live Blog Writer: New Blog Post"
1. Press Enter
1. **Expected**: Blog editor opens with left metadata panel and right editor

### Test 2: Add Metadata

1. In the left panel:
   - Enter a title: "Test Post"
   - Select status: "Draft"
   - Type a tag: "test" and press Enter
   - Type a category: "testing" and press Enter
1. **Expected**:
   - Tags and categories appear as badges
   - Can remove them by clicking ×

### Test 3: Write Content

1. In the TinyMCE editor:
   - Type some text
   - Select text and make it bold
   - Add a bullet list
   - Insert a link
1. **Expected**:
   - Formatting works correctly
   - Toolbar buttons respond
   - Content is preserved

### Test 4: Auto-save

1. Type some content
1. Wait 30 seconds
1. Check console for auto-save messages
1. **Expected**: Auto-save triggers without user action

### Test 5: Configure WordPress (if you have a WordPress blog)

1. In Extension Development Host, open Settings
1. Search for "Live Blog Writer"
1. Configure:

   ```console
   Platform: wordpress
   WordPress URL: https://your-blog.com
   WordPress Username: your-username
   ```

### Test 6: Publish to WordPress

1. Create a test post with title and content
1. Click "Publish Post" button
1. Or use Command Palette: "Live Blog Writer: Publish Post"
1. **Expected**:
   - Success message appears
   - Post appears in WordPress dashboard
   - Check your WordPress blog to verify

### Test 7: Configure Blogger (if you have a Blogger blog)

1. In Extension Development Host, open Settings
1. Search for "Live Blog Writer"
1. Configure:

   ```console
   Platform: blogger
   Blogger Blog ID: your-blog-id
   Blogger API Key: your-api-key
   ```

1. **Expected**: Settings are saved

### Test 8: Publish to Blogger

1. Create a test post with title and content
1. Add some tags and categories
1. Click "Publish Post" button
1. **Expected**:
   - Success message appears
   - Post appears in Blogger dashboard
   - Tags and categories appear as labels

### Test 9: Error Handling - No Configuration

1. Clear all settings
1. Try to publish a post
1. **Expected**: Error message: "Configuration is incomplete"

### Test 10: Error Handling - Empty Title

1. Configure blog settings
1. Create post without title
1. Try to publish
1. **Expected**: Should handle gracefully (title is required in metadata)

### Test 11: Special Characters

1. Create post with special characters in title:
   - "Test & Special \<Characters\> "Quotes""
1. Add content with HTML entities
1. Publish
1. **Expected**:
   - Characters are properly encoded
   - Post displays correctly on blog

### Test 12: Long Content

1. Create a very long post (5000+ words)
1. Publish
1. **Expected**:
   - Extension handles large content
   - Publishing succeeds

### Test 13: Scheduled Publishing

1. Create a post
1. Set publish date to future date/time
1. Set status to "Published"
1. Publish
1. **Expected**:
   - Post is scheduled (WordPress)
   - Check blog to verify scheduled status

### Test 14: Multiple Tags and Categories

1. Add 10+ tags
1. Add 5+ categories
1. Publish
1. **Expected**:
   - All tags/categories are included
   - Visible on blog post

### Test 15: Edit and Republish

1. Publish a post
1. Edit the content
1. Publish again
1. **Expected**: Currently creates a new post (update feature not implemented yet)

## Debugging

### Enable Extension Host Console

1. In Extension Development Host window
1. Go to Help > Toggle Developer Tools
1. Check Console tab for errors

### Check Extension Logs

1. In main VS Code window (not Extension Development Host)
1. Check Debug Console
1. Look for extension activation and command execution logs

### Common Issues

**Issue**: Extension doesn't activate

- **Solution**: Check that extension.ts exports `activate` function
- **Solution**: Verify activationEvents in package.json

**Issue**: Webview doesn't load

- **Solution**: Check Content Security Policy in BlogEditorPanel.ts
- **Solution**: Verify TinyMCE CDN is accessible

**Issue**: Publishing fails

- **Solution**: Check network connectivity
- **Solution**: Verify API credentials
- **Solution**: Check browser console for API errors

**Issue**: TypeScript errors

- **Solution**: Run `npm run compile` to see specific errors
- **Solution**: Check tsconfig.json settings

## Manual Testing Checklist

- [ ] Extension activates successfully
- [ ] New blog post command works
- [ ] Editor UI displays correctly
- [ ] Metadata panel is functional
- [ ] Tags can be added and removed
- [ ] Categories can be added and removed
- [ ] TinyMCE editor loads and works
- [ ] Text formatting works
- [ ] Auto-save triggers
- [ ] WordPress configuration saves
- [ ] Blogger configuration saves
- [ ] Publish to WordPress works
- [ ] Publish to Blogger works
- [ ] Error handling works
- [ ] Special characters handled correctly
- [ ] Long content handled correctly
- [ ] No console errors
- [ ] No memory leaks (check after extended use)

## Performance Testing

1. **Startup Time**: Time from activation to editor ready
   - Target: < 2 seconds
1. **Typing Performance**: No lag when typing
   - Type quickly in editor
   - Should feel responsive
1. **Memory Usage**: Monitor Extension Host process
   - Should not grow continuously
   - Close editor and check for cleanup
1. **API Performance**: Time to publish
   - WordPress: Typically 1-3 seconds
   - Blogger: Typically 2-5 seconds

## Security Testing

1. **Credentials**:
   - Verify credentials not logged to console
   - Check that credentials are stored in VS Code settings securely
1. **Content Sanitization**:
   - Try XSS attacks in content
   - Verify proper escaping
1. **API Security**:
   - Check HTTPS is used for all API calls
   - Verify authentication headers are correct

## Reporting Issues

If you find bugs:

1. Note the steps to reproduce
1. Check console for errors
1. Capture screenshots if relevant
1. Open an issue on GitHub with:
   - Description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, VS Code version, extension version)
   - Error messages/logs

## Next Steps After Testing

1. Fix any bugs found
1. Add unit tests
1. Add integration tests
1. Create CI/CD pipeline
1. Prepare for marketplace publication

## Useful Commands

```bash
# Compile
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Lint
npm run lint

# Clean build
rm -rf out/ && npm run compile

# Check for updates
npm outdated

# Update dependencies
npm update
```

## VS Code Extension Development Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

Happy testing! 🧪
