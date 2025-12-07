# Contributing to Live Blog Writer

Thank you for your interest in contributing to Live Blog Writer! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
1. Clone your fork:

   ```bash
   git clone https://github.com/your-username/live-blog-writer.git
   cd live-blog-writer
   ```

1. Install dependencies:

   ```bash
   npm install
   ```

1. Build the extension:

   ```bash
   npm run compile    # Development build with webpack
   ```

1. For production builds:

   ```bash
   npm run package    # Creates .vsix package
   ```

## Development Setup

### Prerequisites

- Node.js (v20.x or later)
- npm (v10.x or later)
- VS Code (v1.85.0 or later)

### Running the Extension in Development

1. Open the project in VS Code
1. Press `F5` to start debugging
1. A new VS Code window (Extension Development Host) will open with the extension loaded
1. Test your changes in this window

### Project Structure

```console
live-blog-writer/
├── src/
│   ├── extension.ts                    # Main extension entry point
│   ├── types/
│   │   └── globals.d.ts                # TypeScript global declarations
│   ├── services/
│   │   ├── WordPressService.ts         # WordPress REST API client
│   │   ├── BloggerService.ts           # Blogger API v3 client
│   │   ├── MediumService.ts            # Medium API client
│   │   ├── GhostService.ts             # Ghost Admin API client
│   │   ├── SubstackService.ts          # Substack API client
│   │   ├── GoogleOAuthService.ts       # OAuth 2.0 with PKCE for Blogger
│   │   └── DraftManager.ts             # Local draft management
│   └── webview/
│       ├── BlogEditorPanel.ts          # Blog editor webview panel
│       └── BlogConnectionsPanel.ts     # Blog management UI
├── dist/                               # Webpack bundled output (generated)
├── out/                                # TypeScript compiled output (dev only)
├── scripts/
│   └── inject-credentials.js           # (Deprecated) OAuth credential injection
├── webpack.config.js                   # Webpack configuration
├── package.json                        # Extension manifest
├── tsconfig.json                       # TypeScript configuration
└── README.md                           # Documentation
```

## Making Changes

### Workflow

1. Create a new branch for your feature/fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

1. Make your changes

1. Build and test:

   ```bash
   npm run compile
   npm run lint
   ```

1. Commit your changes:

   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

1. Push to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

1. Open a Pull Request

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
1. **Test Multiple Platforms**: If possible, test with WordPress, Blogger, and at least one other platform (Medium, Ghost, or Substack)
1. **Test Blog Management**: Test adding, editing, deleting blog configurations via the visual UI
1. **Test Edge Cases**: Empty fields, special characters, long content, multiple blogs of same platform, etc.

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
- Unit tests for service classes
- Integration tests for each platform
- Improved HTML-to-Mobiledoc conversion for Ghost
- Enhanced HTML-to-ProseMirror conversion for Substack
- Cross-posting (publish same content to multiple blogs simultaneously)

### Medium Priority

- Support for featured/cover images
- Custom post types (WordPress)
- Post scheduling improvements
- Additional blog platforms (Dev.to, Hashnode)
- Markdown support
- Draft sync with remote platforms
- Platform-specific preview

### Low Priority

- UI themes
- Keyboard shortcuts
- Export to various formats
- Post templates

## Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the issue
1. **Steps to Reproduce**: Detailed steps to reproduce the bug
1. **Expected Behavior**: What should happen
1. **Actual Behavior**: What actually happens
1. **Environment**:
   - VS Code version
   - Extension version
   - Operating system
   - Blog platform (WordPress/Blogger)
1. **Screenshots**: If applicable
1. **Error Messages**: Any error messages or logs

## Suggesting Features

We welcome feature suggestions! Please:

1. Check if the feature has already been requested
1. Open an issue with the "enhancement" label
1. Describe the feature and its benefits
1. Explain the use case
1. If possible, suggest an implementation approach

## Code Review Process

1. All changes go through pull request review
1. At least one maintainer must approve the PR
1. All tests must pass
1. Code must follow style guidelines
1. Documentation must be updated if needed

## API Guidelines

### WordPress Service

- Use WordPress REST API v2
- Handle authentication with application passwords
- Include error handling
- Return consistent data structures

### Blogger Service

- Use Blogger API v3
- Implement OAuth 2.0 with PKCE (RFC 7636)
- Handle OAuth tokens securely via GoogleOAuthService
- Include proper error messages
- Follow Google API guidelines

### Medium Service

- Use Medium REST API v1
- Authenticate with Bearer token (integration token)
- Maximum 5 tags per post (API limitation)
- Support both HTML and Markdown content formats

### Ghost Service

- Use Ghost Admin API
- Generate JWT tokens with HS256 signature
- Convert HTML to Mobiledoc format
- Handle API key format (id:secret)

### Substack Service

- Support both email/password and cookie authentication
- Email/password preferred (more stable)
- Convert HTML to ProseMirror document structure
- Follow draft → prepublish → publish workflow

### Webview

- Keep HTML/CSS/JS in respective panel files (BlogEditorPanel.ts, BlogConnectionsPanel.ts)
- Use VS Code theming variables for consistent appearance
- Use data attributes instead of inline event handlers (security)
- Handle messages between webview and extension properly
- Implement proper cleanup on dispose
- Use event delegation for dynamic content

## Security

- Never commit API keys, passwords, or OAuth credentials
- Use VS Code's SecretStorage API for all credentials
- OAuth credentials injected via webpack.DefinePlugin at build time (from .env file)
- Store per-blog credentials with pattern: `liveBlogWriter.{platform}.{blogName}.{credentialType}`
- Validate all user inputs (use proper regex for email validation, etc.)
- Sanitize content before publishing
- Avoid XSS vulnerabilities: use data attributes, not inline onclick with JSON
- Follow OWASP guidelines
- Never use `@ts-ignore` - create proper type declarations instead

## Questions?

If you have questions about contributing, please:

- Open an issue with the "question" label
- Check existing issues and discussions
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing to Live Blog Writer!
