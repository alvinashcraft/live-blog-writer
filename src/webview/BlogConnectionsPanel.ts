import * as vscode from 'vscode';

interface BlogConfig {
    name: string;
    platform: 'wordpress' | 'blogger' | 'ghost' | 'substack';
    id?: string;
    username?: string;
}

export class BlogConnectionsPanel {
    public static currentPanel: BlogConnectionsPanel | undefined;
    public static readonly viewType = 'blogConnections';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private readonly _googleOAuthService: any;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext, googleOAuthService: any) {
        const column = vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (BlogConnectionsPanel.currentPanel) {
            BlogConnectionsPanel.currentPanel._panel.reveal(column);
            BlogConnectionsPanel.currentPanel.refresh();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            BlogConnectionsPanel.viewType,
            'Blog Connections',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        BlogConnectionsPanel.currentPanel = new BlogConnectionsPanel(panel, extensionUri, context, googleOAuthService);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext, googleOAuthService: any) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;
        this._googleOAuthService = googleOAuthService;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'refresh':
                        this.refresh();
                        return;
                    case 'addBlog':
                        await this.handleAddBlog(message.data);
                        return;
                    case 'editBlog':
                        await this.handleEditBlog(message.blogName, message.data);
                        return;
                    case 'deleteBlog':
                        await this.handleDeleteBlog(message.blogName);
                        return;
                    case 'setCredential':
                        await this.handleSetCredential(message.blogName, message.platform, message.credentialType, message.credential);
                        return;
                    case 'setDefaultBlog':
                        await this.handleSetDefaultBlog(message.blogName);
                        return;
                    case 'testConnection':
                        await this.handleTestConnection(message.blogName, message.platform);
                        return;
                    case 'authenticateBlogger':
                        await this.handleAuthenticateBlogger();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public refresh() {
        this._update();
    }

    private async handleAddBlog(data: any) {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);

        // Check if blog name already exists
        if (blogs.some(b => b.name === data.name)) {
            this._panel.webview.postMessage({ command: 'error', message: 'A blog with this name already exists' });
            return;
        }

        const blogConfig: BlogConfig = {
            name: data.name,
            platform: data.platform,
            id: data.id || undefined,
            username: data.username || undefined
        };

        blogs.push(blogConfig);
        await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);

        // Store credential if provided
        if (data.credential) {
            await this.storeCredential(data.name, data.platform, data.credential);
        }

        this._panel.webview.postMessage({ command: 'success', message: 'Blog added successfully' });
        this.refresh();
    }

    private async handleEditBlog(oldName: string, data: any) {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);

        const index = blogs.findIndex(b => b.name === oldName);
        if (index === -1) {
            this._panel.webview.postMessage({ command: 'error', message: 'Blog not found' });
            return;
        }

        // Check if new name conflicts with another blog
        if (data.name !== oldName && blogs.some(b => b.name === data.name)) {
            this._panel.webview.postMessage({ command: 'error', message: 'A blog with this name already exists' });
            return;
        }

        blogs[index] = {
            name: data.name,
            platform: data.platform,
            id: data.id || undefined,
            username: data.username || undefined
        };

        await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);

        // If name changed, migrate credentials and update default blog if needed
        if (data.name !== oldName) {
            // Migrate credentials to new name
            await this.migrateCredentials(oldName, data.name, data.platform);
            
            // Update default blog if it was this one
            const defaultBlog = config.get<string>('defaultBlog', '');
            if (defaultBlog === oldName) {
                await config.update('defaultBlog', data.name, vscode.ConfigurationTarget.Global);
            }
        }

        this._panel.webview.postMessage({ command: 'success', message: 'Blog updated successfully' });
        this.refresh();
    }

    private async handleDeleteBlog(blogName: string) {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);

        const index = blogs.findIndex(b => b.name === blogName);
        if (index === -1) {
            this._panel.webview.postMessage({ command: 'error', message: 'Blog not found' });
            return;
        }

        blogs.splice(index, 1);
        await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);

        // Clear default blog if it was this one
        const defaultBlog = config.get<string>('defaultBlog', '');
        if (defaultBlog === blogName) {
            await config.update('defaultBlog', '', vscode.ConfigurationTarget.Global);
        }

        this._panel.webview.postMessage({ command: 'success', message: 'Blog removed successfully' });
        this.refresh();
    }

    private async handleSetCredential(blogName: string, platform: string, credentialType: string, credential: string) {
        await this.storeCredential(blogName, platform, credential);
        this._panel.webview.postMessage({ command: 'success', message: 'Credential saved successfully' });
        this.refresh();
    }

    private async handleSetDefaultBlog(blogName: string) {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const currentDefault = config.get<string>('defaultBlog', '');
        
        // Toggle: if already default, unset it; otherwise set it
        const newDefault = currentDefault === blogName ? '' : blogName;
        await config.update('defaultBlog', newDefault, vscode.ConfigurationTarget.Global);

        const message = newDefault ? `Set as default blog: ${blogName}` : 'Default blog cleared';
        this._panel.webview.postMessage({ command: 'success', message });
        this.refresh();
    }

    private async handleAuthenticateBlogger() {
        try {
            await vscode.commands.executeCommand('live-blog-writer.authenticateBlogger');
            this._panel.webview.postMessage({ command: 'success', message: 'Blogger authentication completed' });
            this.refresh();
        } catch (error) {
            this._panel.webview.postMessage({ 
                command: 'error', 
                message: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
            });
        }
    }

    private async handleTestConnection(blogName: string, platform: string) {
        // Get the blog config
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);
        const blog = blogs.find(b => b.name === blogName);

        if (!blog) {
            this._panel.webview.postMessage({ command: 'error', message: 'Blog not found' });
            return;
        }

        // Check if credentials exist
        const hasCredential = await this.hasCredential(blogName, platform);
        
        if (!hasCredential) {
            this._panel.webview.postMessage({ 
                command: 'testResult', 
                blogName, 
                success: false, 
                message: 'No credentials configured' 
            });
            return;
        }

        // Basic validation based on platform
        let isValid = true;
        let message = 'Configuration looks valid';

        switch (platform) {
            case 'wordpress':
                if (!blog.id || !blog.username) {
                    isValid = false;
                    message = 'Missing URL or username';
                }
                break;
            case 'blogger':
                if (!blog.id) {
                    isValid = false;
                    message = 'Missing Blog ID';
                }
                break;
            case 'ghost':
                if (!blog.id) {
                    isValid = false;
                    message = 'Missing site URL';
                }
                break;
            case 'substack':
                if (!blog.id) {
                    isValid = false;
                    message = 'Missing hostname';
                }
                break;
        }

        this._panel.webview.postMessage({ 
            command: 'testResult', 
            blogName, 
            success: isValid, 
            message 
        });
    }

    private async storeCredential(blogName: string, platform: string, credential: string) {
        const credType = platform === 'wordpress' ? 'password' : 'apikey';
        const secretKey = this.getSecretKey(platform, blogName, credType);
        await this._context.secrets.store(secretKey, credential);
    }

    private async hasCredential(blogName: string, platform: string): Promise<boolean> {
        // Blogger uses OAuth stored globally, not per-blog
        if (platform === 'blogger') {
            try {
                const isAuthenticated = await this._googleOAuthService.isAuthenticated();
                return isAuthenticated;
            } catch {
                return false;
            }
        }
        
        const credType = platform === 'wordpress' ? 'password' : 'apikey';
        const secretKey = this.getSecretKey(platform, blogName, credType);
        const credential = await this._context.secrets.get(secretKey);
        return !!credential;
    }

    private getSecretKey(platform: string, blogName: string, credentialType: string): string {
        return `liveBlogWriter.${platform}.${blogName}.${credentialType}`;
    }

    private async migrateCredentials(oldName: string, newName: string, platform: string): Promise<void> {
        // Blogger doesn't use per-blog credentials
        if (platform === 'blogger') {
            return;
        }

        // Get the credential type for this platform
        const credType = platform === 'wordpress' ? 'password' : 'apikey';
        
        // For Substack, also migrate email and password if they exist
        if (platform === 'substack') {
            const credTypes = ['email', 'password', 'apikey'];
            for (const ct of credTypes) {
                const oldKey = this.getSecretKey(platform, oldName, ct);
                const oldCred = await this._context.secrets.get(oldKey);
                if (oldCred) {
                    const newKey = this.getSecretKey(platform, newName, ct);
                    await this._context.secrets.store(newKey, oldCred);
                    await this._context.secrets.delete(oldKey);
                }
            }
        } else {
            // For other platforms, just migrate the main credential
            const oldKey = this.getSecretKey(platform, oldName, credType);
            const oldCred = await this._context.secrets.get(oldKey);
            if (oldCred) {
                const newKey = this.getSecretKey(platform, newName, credType);
                await this._context.secrets.store(newKey, oldCred);
                await this._context.secrets.delete(oldKey);
            }
        }
    }

    public dispose() {
        BlogConnectionsPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private async _update() {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);
        const defaultBlog = config.get<string>('defaultBlog', '');

        // Check credentials for each blog
        const blogsWithStatus = await Promise.all(blogs.map(async blog => {
            const hasCredential = await this.hasCredential(blog.name, blog.platform);
            return {
                ...blog,
                hasCredential,
                isDefault: blog.name === defaultBlog
            };
        }));

        this._panel.webview.html = this._getHtmlForWebview(blogsWithStatus);
    }

    private _getHtmlForWebview(blogs: any[]) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog Connections</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        h1 {
            font-size: 24px;
            font-weight: 600;
        }

        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 13px;
        }

        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .btn-small {
            padding: 4px 10px;
            font-size: 12px;
        }

        .blog-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 16px;
            margin-top: 20px;
        }

        .blog-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            position: relative;
        }

        .blog-card.default {
            border: 2px solid var(--vscode-focusBorder);
            background-color: var(--vscode-list-hoverBackground);
        }

        .blog-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 12px;
        }

        .blog-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .blog-platform {
            display: inline-block;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 8px;
        }

        .blog-info {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin: 4px 0;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 6px;
            margin: 12px 0;
            font-size: 12px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .status-dot.connected {
            background-color: #4caf50;
        }

        .status-dot.disconnected {
            background-color: #f44336;
        }

        .blog-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
            flex-wrap: wrap;
        }

        .default-badge {
            background-color: var(--vscode-testing-iconPassed);
            color: white;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state h2 {
            margin-bottom: 12px;
            font-size: 18px;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.6);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .modal-header h2 {
            font-size: 18px;
        }

        .close-btn {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: 24px;
            padding: 0;
            width: 30px;
            height: 30px;
        }

        .form-group {
            margin-bottom: 16px;
        }

        .form-label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 500;
        }

        .form-input, .form-select {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-size: 13px;
        }

        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .form-help {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 20px;
        }

        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            font-size: 13px;
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
        }

        .notification.success {
            background-color: var(--vscode-testing-iconPassed);
            color: white;
        }

        .notification.error {
            background-color: var(--vscode-testing-iconFailed);
            color: white;
        }

        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Blog Connections</h1>
        <button class="btn" onclick="showAddModal()">+ Add Blog</button>
    </div>

    ${blogs.length === 0 ? `
    <div class="empty-state">
        <h2>No blogs configured yet</h2>
        <p>Add your first blog to get started with publishing</p>
    </div>
    ` : `
    <div class="blog-grid">
        ${blogs.map(blog => `
        <div class="blog-card ${blog.isDefault ? 'default' : ''}">
            <div class="blog-header">
                <div>
                    <div class="blog-title">${this.escapeHtml(blog.name)}</div>
                    <span class="blog-platform">${blog.platform}</span>
                    ${blog.isDefault ? '<span class="default-badge">Default</span>' : ''}
                </div>
            </div>
            
            ${blog.id ? `<div class="blog-info"><strong>ID/URL:</strong> ${this.escapeHtml(blog.id)}</div>` : ''}
            ${blog.username ? `<div class="blog-info"><strong>Username:</strong> ${this.escapeHtml(blog.username)}</div>` : ''}
            
            <div class="status-indicator">
                <span class="status-dot ${blog.hasCredential ? 'connected' : 'disconnected'}"></span>
                <span>${blog.hasCredential ? 'Credentials configured' : (blog.platform === 'blogger' ? 'Not authenticated' : 'No credentials')}</span>
            </div>

            <div class="blog-actions">
                <button class="btn btn-small btn-secondary" data-action="edit" data-blog-name="${this.escapeHtml(blog.name)}" data-blog-platform="${blog.platform}" data-blog-id="${this.escapeHtml(blog.id || '')}" data-blog-username="${this.escapeHtml(blog.username || '')}">Edit</button>
                ${blog.platform === 'blogger' ? 
                    (blog.hasCredential ? 
                        '<button class="btn btn-small btn-secondary" data-action="authenticate-blogger">Re-authenticate</button>' :
                        '<button class="btn btn-small btn-secondary" data-action="authenticate-blogger">Authenticate</button>') :
                    '<button class="btn btn-small btn-secondary" data-action="set-credential" data-blog-name="' + this.escapeHtml(blog.name) + '" data-blog-platform="' + blog.platform + '">' + (blog.hasCredential ? 'Update Credential' : 'Set Credential') + '</button>'
                }
                <button class="btn btn-small btn-secondary" data-action="set-default" data-blog-name="${this.escapeHtml(blog.name)}">${blog.isDefault ? 'Unset Default' : 'Set Default'}</button>
                <button class="btn btn-small btn-secondary" data-action="test" data-blog-name="${this.escapeHtml(blog.name)}" data-blog-platform="${blog.platform}">Test</button>
                <button class="btn btn-small btn-secondary" data-action="delete" data-blog-name="${this.escapeHtml(blog.name)}">Delete</button>
            </div>
        </div>
        `).join('')}
    </div>
    `}

    <!-- Add/Edit Blog Modal -->
    <div id="blogModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Add Blog</h2>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <form id="blogForm">
                <input type="hidden" id="editMode" value="false">
                <input type="hidden" id="originalName" value="">
                
                <div class="form-group">
                    <label class="form-label" for="blogName">Blog Name *</label>
                    <input type="text" id="blogName" class="form-input" placeholder="My Blog" required>
                    <div class="form-help">A friendly name to identify this blog</div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="platform">Platform *</label>
                    <select id="platform" class="form-select" required onchange="updateFormFields()">
                        <option value="">Select platform...</option>
                        <option value="wordpress">WordPress</option>
                        <option value="blogger">Blogger</option>
                        <option value="ghost">Ghost</option>
                        <option value="substack">Substack</option>
                    </select>
                </div>

                <div id="platformFields"></div>

                <div class="form-group" id="credentialGroup">
                    <label class="form-label" for="credential"><span id="credentialLabel">Credential</span></label>
                    <input type="password" id="credential" class="form-input" placeholder="Leave blank to set later">
                    <div class="form-help" id="credentialHelp">Optional: You can set this later</div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn">Save</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Credential Modal -->
    <div id="credentialModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Set Credential</h2>
                <button class="close-btn" onclick="closeCredentialModal()">&times;</button>
            </div>
            
            <form id="credentialForm">
                <input type="hidden" id="credBlogName" value="">
                <input type="hidden" id="credPlatform" value="">
                
                <div class="form-group">
                    <label class="form-label" for="credentialInput"><span id="credInputLabel">Credential</span></label>
                    <input type="password" id="credentialInput" class="form-input" required>
                    <div class="form-help" id="credInputHelp"></div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeCredentialModal()">Cancel</button>
                    <button type="submit" class="btn">Save</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Helper function to escape HTML/special characters in user input
        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            // Also escape backticks to prevent template literal injection
            return text.replace(/[&<>"']/g, m => map[m]).replace(/\`/g, '&#96;');
        }

        const platformFields = {
            wordpress: [
                { name: 'id', label: 'WordPress URL', placeholder: 'https://myblog.com', required: true, help: 'Your WordPress site URL' },
                { name: 'username', label: 'Username', placeholder: 'username', required: true, help: 'Your WordPress username' }
            ],
            blogger: [
                { name: 'id', label: 'Blog ID', placeholder: '1234567890', required: true, help: 'Your Blogger Blog ID' }
            ],
            ghost: [
                { name: 'id', label: 'Site URL', placeholder: 'https://myblog.com', required: true, help: 'Your Ghost site URL' }
            ],
            substack: [
                { name: 'id', label: 'Hostname', placeholder: 'myblog.substack.com', required: true, help: 'Your Substack hostname' },
                { name: 'username', label: 'Username', placeholder: 'username', required: false, help: 'Your Substack username (optional)' }
            ]
        };

        const credentialLabels = {
            wordpress: { label: 'Application Password', help: 'WordPress application password' },
            blogger: { label: 'OAuth (handled automatically)', help: 'OAuth authentication is managed automatically' },
            ghost: { label: 'Admin API Key', help: 'Format: id:secret from Ghost Admin → Integrations' },
            substack: { label: 'API Key or Cookie', help: 'Substack API credentials' }
        };

        function updateFormFields() {
            const platform = document.getElementById('platform').value;
            const fieldsContainer = document.getElementById('platformFields');
            const credentialGroup = document.getElementById('credentialGroup');
            const credentialLabel = document.getElementById('credentialLabel');
            const credentialHelp = document.getElementById('credentialHelp');
            
            fieldsContainer.innerHTML = '';

            if (platform && platformFields[platform]) {
                platformFields[platform].forEach(field => {
                    const div = document.createElement('div');
                    div.className = 'form-group';
                    div.innerHTML = \`
                        <label class="form-label" for="\${field.name}">\${field.label} \${field.required ? '*' : ''}</label>
                        <input type="text" id="\${field.name}" class="form-input" placeholder="\${field.placeholder}" \${field.required ? 'required' : ''}>
                        <div class="form-help">\${field.help}</div>
                    \`;
                    fieldsContainer.appendChild(div);
                });

                if (credentialLabels[platform]) {
                    credentialLabel.textContent = credentialLabels[platform].label;
                    credentialHelp.textContent = credentialLabels[platform].help;
                    credentialGroup.style.display = platform === 'blogger' ? 'none' : 'block';
                }
            }
        }

        function showAddModal() {
            document.getElementById('modalTitle').textContent = 'Add Blog';
            document.getElementById('editMode').value = 'false';
            document.getElementById('blogForm').reset();
            document.getElementById('platformFields').innerHTML = '';
            document.getElementById('credentialGroup').style.display = 'block';
            document.getElementById('blogModal').classList.add('active');
        }

        // Event delegation for blog action buttons
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!target.matches('[data-action]')) return;
            
            const action = target.getAttribute('data-action');
            const blogName = target.getAttribute('data-blog-name');
            const platform = target.getAttribute('data-blog-platform');
            
            switch (action) {
                case 'edit':
                    editBlog({
                        name: blogName,
                        platform: platform,
                        id: target.getAttribute('data-blog-id'),
                        username: target.getAttribute('data-blog-username')
                    });
                    break;
                case 'authenticate-blogger':
                    authenticateBlogger();
                    break;
                case 'set-credential':
                    setCredential(blogName, platform);
                    break;
                case 'set-default':
                    setDefaultBlog(blogName);
                    break;
                case 'test':
                    testConnection(blogName, platform);
                    break;
                case 'delete':
                    deleteBlog(blogName);
                    break;
            }
        });

        function editBlog(blog) {
            document.getElementById('modalTitle').textContent = 'Edit Blog';
            document.getElementById('editMode').value = 'true';
            document.getElementById('originalName').value = blog.name;
            document.getElementById('blogName').value = blog.name;
            document.getElementById('platform').value = blog.platform;
            
            updateFormFields();
            
            if (blog.id) document.getElementById('id').value = blog.id;
            if (blog.username) document.getElementById('username').value = blog.username;
            
            document.getElementById('credentialGroup').style.display = 'none';
            document.getElementById('blogModal').classList.add('active');
        }

        function closeModal() {
            document.getElementById('blogModal').classList.remove('active');
        }

        function setCredential(blogName, platform) {
            document.getElementById('credBlogName').value = blogName;
            document.getElementById('credPlatform').value = platform;
            
            if (credentialLabels[platform]) {
                document.getElementById('credInputLabel').textContent = credentialLabels[platform].label;
                document.getElementById('credInputHelp').textContent = credentialLabels[platform].help;
            }
            
            document.getElementById('credentialModal').classList.add('active');
        }

        function closeCredentialModal() {
            document.getElementById('credentialModal').classList.remove('active');
            document.getElementById('credentialForm').reset();
        }

        function setDefaultBlog(blogName) {
            vscode.postMessage({ command: 'setDefaultBlog', blogName });
        }

        function authenticateBlogger() {
            vscode.postMessage({ command: 'authenticateBlogger' });
            showNotification('Starting Blogger authentication...', 'success');
        }

        function testConnection(blogName, platform) {
            vscode.postMessage({ command: 'testConnection', blogName, platform });
            showNotification('Testing connection...', 'success');
        }

        function deleteBlog(blogName) {
            // Escape blogName to prevent issues with special characters in confirm dialog
            const escapedName = escapeHtml(blogName);
            if (confirm(\`Are you sure you want to delete "\${escapedName}"?\`)) {
                vscode.postMessage({ command: 'deleteBlog', blogName });
            }
        }

        document.getElementById('blogForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const editMode = document.getElementById('editMode').value === 'true';
            const data = {
                name: document.getElementById('blogName').value,
                platform: document.getElementById('platform').value,
                id: document.getElementById('id')?.value || '',
                username: document.getElementById('username')?.value || '',
                credential: document.getElementById('credential')?.value || ''
            };

            if (editMode) {
                const originalName = document.getElementById('originalName').value;
                vscode.postMessage({ command: 'editBlog', blogName: originalName, data });
            } else {
                vscode.postMessage({ command: 'addBlog', data });
            }

            closeModal();
        });

        document.getElementById('credentialForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const blogName = document.getElementById('credBlogName').value;
            const platform = document.getElementById('credPlatform').value;
            const credential = document.getElementById('credentialInput').value;

            vscode.postMessage({ 
                command: 'setCredential', 
                blogName, 
                platform, 
                credentialType: platform === 'wordpress' ? 'password' : 'apikey',
                credential 
            });

            closeCredentialModal();
        });

        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = \`notification \${type}\`;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'success':
                    showNotification(message.message, 'success');
                    break;
                case 'error':
                    showNotification(message.message, 'error');
                    break;
                case 'testResult':
                    const resultType = message.success ? 'success' : 'error';
                    const escapedBlogName = escapeHtml(message.blogName);
                    showNotification(\`\${escapedBlogName}: \${message.message}\`, resultType);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}
