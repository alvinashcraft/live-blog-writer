# GitHub Copilot Instructions for Live Blog Writer

## Project Overview

Live Blog Writer is a VS Code extension that provides a WYSIWYG editor and Markdown editor for creating and publishing blog posts to multiple platforms (WordPress, Blogger, Ghost, Substack, and Dev.to). The extension supports multiple blog configurations, allowing users to manage and publish to multiple blogs from a single interface.

## Tech Stack

- **Language**: TypeScript 5.3+
- **Target**: VS Code Extension (VS Code 1.85.0+)
- **Build System**: Webpack 5.x (production), TypeScript compiler (development)
- **Runtime**: Node.js 20.x, ES2020
- **Key Dependencies**:
  - `axios` 1.12.2 - HTTP client for API calls
  - `markdown-it` 14.1.0 - Markdown parsing and conversion
  - TinyMCE - WYSIWYG HTML editor (loaded via CDN in webview)
  - EasyMDE - Markdown editor (loaded via CDN in webview)
- **Linter**: ESLint with TypeScript plugin
- **Authentication**: VS Code SecretStorage API for secure credential storage

## Project Structure

```
src/
├── extension.ts                    # Main extension entry point and command registration
├── services/                       # Platform-specific API clients
│   ├── WordPressService.ts        # WordPress REST API v2 client
│   ├── BloggerService.ts          # Blogger API v3 client with OAuth 2.0/PKCE
│   ├── GhostService.ts            # Ghost Admin API client with JWT auth
│   ├── SubstackService.ts         # Substack API client
│   ├── DevToService.ts            # Dev.to API client
│   ├── GoogleOAuthService.ts      # OAuth 2.0 with PKCE (S256) for Blogger
│   └── DraftManager.ts            # Local draft storage and management
├── webview/                       # Webview panels
│   ├── BlogEditorPanel.ts         # Main blog post editor webview
│   └── BlogConnectionsPanel.ts    # Blog management UI webview
└── types/
    └── globals.d.ts               # TypeScript global type declarations

dist/        # Webpack bundled output (production)
out/         # TypeScript compiled output (development only)
docs/        # Documentation (guides, setup instructions, etc.)
```

## Build, Test, and Lint Commands

1. **Install dependencies**: `npm install`
1. **Development build** (TypeScript only): `npm run compile:tsc`
1. **Development build** (Webpack): `npm run compile`
1. **Watch mode** (TypeScript): `npm run watch:tsc`
1. **Watch mode** (Webpack): `npm run watch`
1. **Production build**: `npm run package:production`
1. **Lint code**: `npm run lint`
1. **Run tests**: `npm test` (runs pretest which includes compile:tsc and lint)
1. **Package extension**: `npm run package` (creates .vsix file)
1. **Debug extension**: Press F5 in VS Code to launch Extension Development Host

## Coding Standards and Conventions

### TypeScript

1. **Strict mode enabled**: All TypeScript strict checks are enforced
1. **Target ES2020**: Use ES2020 features
1. **Module system**: CommonJS for Node.js compatibility
1. **Naming conventions** (enforced by ESLint):
   - Use camelCase for object literal properties (warning level)
   - Exceptions allowed for API headers (e.g., `Content-Type`) and API parameters (e.g., `per_page`)
1. **Semicolons**: Required (enforced by ESLint)
1. **Equality**: Use strict equality (`===` and `!==`)
1. **Curly braces**: Required for all control structures
1. **No throw literals**: Throw proper Error objects
1. **Types**: Avoid using `any` type; prefer proper type definitions

### File Organization

1. **Services**: Each platform has its own service class in `src/services/`
1. **Webviews**: Each webview panel has its own class in `src/webview/`
1. **Types**: Shared types defined in `src/types/` or within relevant service files
1. **Secrets**: NEVER commit secrets, API keys, or credentials
   - Use VS Code SecretStorage API for secure storage
   - Use environment variables for local development (`.env.example` provided)

### Security

1. **Credential Storage**: Use VS Code SecretStorage API exclusively
   - Format: `liveBlogWriter.{platform}.{blogName}.{credentialType}`
   - Never store credentials in settings.json or plain text files
1. **OAuth**: Implement PKCE (Proof Key for Code Exchange) with S256 for OAuth flows
1. **Input Validation**: Validate all user inputs before processing
1. **API Calls**: Use axios for HTTP requests with proper error handling
1. **Webview Security**: 
   - Use Content Security Policy in webviews
   - Use event delegation for user interactions
   - Sanitize all user-provided content before rendering

### Documentation

1. **Inline Comments**: Only add comments for complex logic; code should be self-documenting
1. **README.md**: Keep user-facing documentation in README.md
1. **docs/**: Technical documentation, guides, and references go in the docs/ folder
1. **Markdown**: Follow markdown formatting rules (see below)

## Markdown Formatting Rules

Apply to: `**/*.md`

### Numbered Lists

1. ALWAYS use "1." for every numbered list item
1. NEVER use sequential numbers (2., 3., 4., etc.)
1. This makes it easier to insert, remove, or reorder items

Example:
```markdown
1. First item
1. Second item
1. Third item
```

NOT:
```markdown
1. First item
2. Second item
3. Third item
```

### List Spacing

1. NO blank lines between list items within the same list
1. NO blank lines when indentation changes (sub-lists)
1. DO include blank lines before and after the entire list

Example:
```markdown
Some text before.

1. Item one
1. Item two
   - Sub-item A
   - Sub-item B
1. Item three

Some text after.
```

NOT:
```markdown
Some text before.
1. Item one

1. Item two

   - Sub-item A
   
   - Sub-item B

1. Item three
Some text after.
```

### Heading Spacing

1. ALWAYS include a blank line before a heading
1. ALWAYS include a blank line after a heading

Example:
```markdown
Some paragraph text.

## Heading

More paragraph text.
```

## Platform-Specific Notes

### WordPress

1. Use REST API v2 endpoints
1. Authentication: Application password (not regular password)
1. Handle tags and categories as simplified strings

### Blogger

1. Use Blogger API v3
1. OAuth 2.0 with PKCE required
1. Tags and categories combined as "labels"
1. OAuth credentials managed via Azure Key Vault (production) or environment variables (dev)

### Ghost

1. Use Ghost Admin API
1. JWT (HS256) authentication
1. Content format: Mobiledoc (convert HTML to Mobiledoc)
1. Tags supported, categories not applicable

### Substack

1. Cookie-based authentication recommended (email/password may not work)
1. Content format: ProseMirror (convert HTML to ProseMirror)
1. Draft creation workflow (posts created as drafts)

### Dev.to

1. API key authentication
1. Markdown content REQUIRED (HTML not supported)
1. Maximum 4 tags (trim combined tags/categories to 4)

## Extension Configuration

1. **Multi-blog support**: `liveBlogWriter.blogs` array
   - Each entry: `{ name, platform, id?, username? }`
1. **Default blog**: `liveBlogWriter.defaultBlog` (matches name from blogs array)
1. **Legacy settings**: Deprecated single-blog settings still supported for migration
1. **Secure credentials**: Stored in VS Code SecretStorage, NOT in settings.json

## Testing and Quality

1. **Before committing**: Run `npm run lint` to check for issues
1. **Test extension**: Press F5 to launch Extension Development Host
1. **Test each platform**: Verify changes don't break existing platform integrations
1. **Webview testing**: Test both HTML and Markdown editor modes

## Common Tasks

### Adding a new blog platform

1. Create new service class in `src/services/` (e.g., `NewPlatformService.ts`)
1. Implement authentication method
1. Add platform to `BlogConfig` type in `extension.ts`
1. Add command for setting credentials in `package.json` and `extension.ts`
1. Update `BlogEditorPanel` to handle new platform
1. Add platform to configuration enums in `package.json`
1. Create setup guide in `docs/`

### Modifying the editor UI

1. Edit webview HTML/CSS in `BlogEditorPanel.ts`
1. Ensure CSP compliance for any external resources
1. Test event delegation for user interactions
1. Verify auto-save functionality still works

### Updating dependencies

1. Review security advisories before updating
1. Test build after updating: `npm run compile`
1. Test extension functionality in Extension Development Host
1. Update package-lock.json: `npm install`

## Best Practices

1. **Minimal changes**: Make the smallest possible changes to achieve the goal
1. **Don't break existing functionality**: Test related features after changes
1. **Security first**: Never compromise security for convenience
1. **User experience**: Keep the UI simple and intuitive
1. **Error handling**: Provide clear, actionable error messages
1. **Documentation**: Update docs when changing user-facing features
1. **Backward compatibility**: Support migration from deprecated features

## Prohibited Actions

1. NEVER commit secrets, API keys, credentials, or tokens
1. NEVER modify `.github/workflows/` files without understanding CI/CD impacts
1. NEVER store credentials in settings.json or configuration files
1. NEVER disable security features (CSP, PKCE, etc.)
1. NEVER remove or modify working code without a specific reason
