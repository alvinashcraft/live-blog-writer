# Contributing to Live Blog Writer

Thank you for your interest in contributing to Live Blog Writer! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/live-blog-writer.git
   cd live-blog-writer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the extension:
   ```bash
   npm run compile
   ```

## Development Setup

### Prerequisites
- Node.js (v20.x or later)
- npm (v10.x or later)
- VS Code (v1.85.0 or later)

### Running the Extension in Development

1. Open the project in VS Code
2. Press `F5` to start debugging
3. A new VS Code window (Extension Development Host) will open with the extension loaded
4. Test your changes in this window

### Project Structure

```
live-blog-writer/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── services/
│   │   ├── WordPressService.ts   # WordPress REST API client
│   │   └── BloggerService.ts     # Blogger REST API client
│   └── webview/
│       └── BlogEditorPanel.ts    # Blog editor webview panel
├── out/                          # Compiled JavaScript (generated)
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Documentation
```

## Making Changes

### Workflow

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Build and test:
   ```bash
   npm run compile
   npm run lint
   ```

4. Commit your changes:
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small
- Use async/await for asynchronous operations

### Linting

Run ESLint to check code style:
```bash
npm run lint
```

Fix auto-fixable issues:
```bash
npm run lint -- --fix
```

### Testing

Before submitting a PR:

1. **Manual Testing**: Test the extension in the Extension Development Host
2. **Test Both Platforms**: If possible, test with both WordPress and Blogger
3. **Test Edge Cases**: Empty fields, special characters, long content, etc.

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Keep the first line under 72 characters
- Add more details in the body if needed

Examples:
- "Add support for featured images"
- "Fix tag handling in WordPress service"
- "Update TinyMCE to version 7.0"

## Areas for Contribution

### High Priority
- Image upload functionality
- Draft management (list, edit existing drafts)
- Full tag/category ID mapping for WordPress
- Unit tests
- Integration tests

### Medium Priority
- Support for featured/cover images
- Custom post types (WordPress)
- Post scheduling improvements
- Additional blog platforms (Medium, Dev.to)
- Markdown support

### Low Priority
- UI themes
- Keyboard shortcuts
- Export to various formats
- Post templates

## Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**:
   - VS Code version
   - Extension version
   - Operating system
   - Blog platform (WordPress/Blogger)
6. **Screenshots**: If applicable
7. **Error Messages**: Any error messages or logs

## Suggesting Features

We welcome feature suggestions! Please:

1. Check if the feature has already been requested
2. Open an issue with the "enhancement" label
3. Describe the feature and its benefits
4. Explain the use case
5. If possible, suggest an implementation approach

## Code Review Process

1. All changes go through pull request review
2. At least one maintainer must approve the PR
3. All tests must pass
4. Code must follow style guidelines
5. Documentation must be updated if needed

## API Guidelines

### WordPress Service
- Use WordPress REST API v2
- Handle authentication properly
- Include error handling
- Return consistent data structures

### Blogger Service
- Use Blogger API v3
- Handle API keys securely
- Include proper error messages
- Follow Google API guidelines

### Webview
- Keep HTML/CSS/JS in BlogEditorPanel.ts
- Use VS Code theming variables
- Handle messages between webview and extension properly
- Implement proper cleanup on dispose

## Security

- Never commit API keys or passwords
- Use VS Code's secure storage for credentials
- Validate all user inputs
- Sanitize content before publishing
- Follow OWASP guidelines

## Questions?

If you have questions about contributing, please:
- Open an issue with the "question" label
- Check existing issues and discussions
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing to Live Blog Writer!
