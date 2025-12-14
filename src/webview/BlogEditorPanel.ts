import * as vscode from 'vscode';
import { DraftManager, DraftContent } from '../services/DraftManager';

export class BlogEditorPanel {
    public static currentPanel: BlogEditorPanel | undefined;
    public static readonly viewType = 'blogEditor';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _draftManager: DraftManager;
    private _disposables: vscode.Disposable[] = [];
    private _postData: { 
        title: string; 
        content: string;
        contentFormat?: 'html' | 'markdown';
        publishDate?: string;
        tags?: string[];
        categories?: string[];
        excerpt?: string;
        status?: string;
        selectedBlog?: string;
    } | null = null;
    private _currentDraftId: string | undefined;
    private _autoSaveInterval: NodeJS.Timeout | undefined;

    public static createOrShow(extensionUri: vscode.Uri, draftManager?: DraftManager, draftContent?: DraftContent) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (BlogEditorPanel.currentPanel) {
            BlogEditorPanel.currentPanel._panel.reveal(column);
            // Load draft content if provided
            if (draftContent) {
                BlogEditorPanel.currentPanel.loadDraftContent(draftContent);
            }
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            BlogEditorPanel.viewType,
            'Blog Editor',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        BlogEditorPanel.currentPanel = new BlogEditorPanel(panel, extensionUri, draftManager, draftContent);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, draftManager?: DraftManager, draftContent?: DraftContent) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._draftManager = draftManager || new DraftManager();

        // Load draft content if provided
        if (draftContent) {
            this.loadDraftContent(draftContent);
        }

        // Set the webview's initial html content
        this._update();

        // Start auto-save interval (every 30 seconds)
        this.startAutoSave();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                console.log('BlogEditorPanel received message:', message.command);
                switch (message.command) {
                    case 'savePostData':
                        this._postData = {
                            title: message.title,
                            content: message.content,
                            contentFormat: message.contentFormat,
                            publishDate: message.publishDate,
                            tags: message.tags,
                            categories: message.categories,
                            excerpt: message.excerpt,
                            status: message.status,
                            selectedBlog: message.selectedBlog
                        };
                        console.log('Post data saved:', this._postData);
                        return;
                    case 'publish':
                        // Trigger the publish command
                        console.log('Executing publish command');
                        vscode.commands.executeCommand('live-blog-writer.publishPost');
                        return;
                    case 'info':
                        // Show info message
                        console.log('Showing info message:', message.text);
                        vscode.window.showInformationMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public async getPostData(): Promise<{ 
        title: string; 
        content: string;
        contentFormat?: 'html' | 'markdown';
        publishDate?: string;
        tags?: string[];
        categories?: string[];
        excerpt?: string;
        status?: string;
        selectedBlog?: string;
    } | null> {
        // Request current data from webview
        await this._panel.webview.postMessage({ command: 'getPostData' });
        
        // Wait a bit for the response
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return this._postData;
    }

    public dispose() {
        BlogEditorPanel.currentPanel = undefined;

        // Stop auto-save
        if (this._autoSaveInterval) {
            clearInterval(this._autoSaveInterval);
        }

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private loadDraftContent(draftContent: DraftContent) {
        this._postData = {
            title: draftContent.title,
            content: draftContent.content,
            contentFormat: draftContent.contentFormat,
            publishDate: draftContent.publishDate,
            tags: draftContent.tags,
            categories: draftContent.categories,
            excerpt: draftContent.excerpt,
            status: draftContent.status
        };
        this._currentDraftId = draftContent.metadata.id;
        
        // Update webview title to show the draft
        this._panel.title = `Blog Editor - ${draftContent.title || 'Untitled Draft'}`;
    }

    private startAutoSave() {
        // Auto-save every 30 seconds
        this._autoSaveInterval = setInterval(async () => {
            try {
                await this.saveDraftToFile();
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, 30000);
    }

    public async saveDraftManually(): Promise<string> {
        return await this.saveDraftToFile();
    }

    private async saveDraftToFile(): Promise<string> {
        if (!this._postData) {
            throw new Error('No post data to save');
        }

        try {
            const draftId = await this._draftManager.saveDraft(this._postData, this._currentDraftId);
            
            if (!this._currentDraftId) {
                this._currentDraftId = draftId;
                // Update panel title
                this._panel.title = `Blog Editor - ${this._postData.title || 'Untitled Draft'}`;
            }
            
            return draftId;
        } catch (error) {
            console.error('Failed to save draft:', error);
            throw error;
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        // Get blog configurations
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<any[]>('blogs', []);
        const defaultBlog = config.get<string>('defaultBlog', '');

        // Inject draft data if available
        const draftDataScript = this._postData ? 
            `window.draftData = ${JSON.stringify(this._postData)};` : 
            'window.draftData = null;';
        
        // Inject blog configurations and default blog
        const blogConfigsScript = `window.blogConfigs = ${JSON.stringify(blogs)}; window.defaultBlog = ${JSON.stringify(defaultBlog)};`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src ${webview.cspSource} https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src ${webview.cspSource} https: data:;">
    <title>Blog Editor</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.css">
    <style>
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .main-container {
            display: flex;
            height: 100vh;
            overflow: hidden;
        }
        .metadata-panel {
            width: 300px;
            padding: 20px;
            background-color: var(--vscode-sideBar-background);
            border-right: 1px solid var(--vscode-sideBar-border);
            overflow-y: auto;
            flex-shrink: 0;
        }
        .metadata-panel h2 {
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 18px;
            font-weight: 600;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-size: 13px;
            font-weight: 500;
        }
        .form-group input[type="text"],
        .form-group input[type="datetime-local"],
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 6px 8px;
            font-size: 13px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            box-sizing: border-box;
        }
        .form-group textarea {
            resize: vertical;
            min-height: 60px;
            font-family: var(--vscode-font-family);
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        .tags-input {
            margin-bottom: 5px;
        }
        .tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 8px;
        }
        .tag-item {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .tag-remove {
            cursor: pointer;
            font-weight: bold;
        }
        .tag-remove:hover {
            color: var(--vscode-errorForeground);
        }
        .hint-text {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 3px;
        }
        .editor-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .editor-content.markdown-mode {
            background-color: var(--vscode-editor-background);
        }
        #htmlEditorContainer,
        #markdownEditorContainer {
            height: calc(100vh - 120px);
        }
        #markdownEditorContainer {
            display: none;
        }
        .EasyMDEContainer {
            height: 100%;
        }
        .EasyMDEContainer .CodeMirror {
            height: 100%;
            border: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .editor-toolbar {
            border: 1px solid var(--vscode-panel-border);
            border-bottom: none;
            background-color: var(--vscode-editor-background);
        }
        .editor-preview,
        .editor-preview-side {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .editor-header {
            padding: 20px 20px 10px 20px;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .editor-header h1 {
            margin: 0 0 10px 0;
            font-size: 20px;
        }
        .editor-content {
            flex: 1;
            padding: 20px;
            background-color: white;
            overflow: auto;
        }
        .button-container {
            padding: 15px 20px;
            display: flex;
            gap: 10px;
            background-color: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
        }
        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            font-size: 14px;
            border-radius: 2px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="main-container">
        <!-- Left Metadata Panel -->
        <div class="metadata-panel">
            <h2>Post Details</h2>
            
            <div class="form-group">
                <label for="selectedBlog">Selected Blog</label>
                <select id="selectedBlog">
                    <option value="">-- Select a blog --</option>
                </select>
                <div class="hint-text">Choose which blog to publish to</div>
            </div>

            <div class="form-group">
                <label for="postTitle">Title *</label>
                <input type="text" id="postTitle" placeholder="Enter post title..." required />
            </div>

            <div class="form-group">
                <label for="contentFormat">Content format</label>
                <select id="contentFormat">
                    <option value="html">HTML</option>
                    <option value="markdown">Markdown</option>
                </select>
                <div class="hint-text">Choose Markdown for Dev.to or HTML for other platforms</div>
            </div>

            <div class="form-group">
                <label for="postStatus">Status</label>
                <select id="postStatus">
                    <option value="draft">Draft</option>
                    <option value="publish">Published</option>
                    <option value="pending">Pending Review</option>
                    <option value="private">Private</option>
                </select>
            </div>

            <div class="form-group">
                <label for="publishDate">Publish Date</label>
                <input type="datetime-local" id="publishDate" />
                <div class="hint-text">Leave empty to publish immediately</div>
            </div>

            <div class="form-group">
                <label for="postExcerpt">Excerpt</label>
                <textarea id="postExcerpt" placeholder="Optional post excerpt..."></textarea>
                <div class="hint-text">Brief summary of your post</div>
            </div>

            <div class="form-group">
                <label for="tagsInput">Tags</label>
                <input type="text" id="tagsInput" class="tags-input" placeholder="Add tag and press Enter..." />
                <div class="hint-text">Press Enter to add each tag</div>
                <div class="tag-list" id="tagList"></div>
            </div>

            <div class="form-group">
                <label for="categoriesInput">Categories</label>
                <input type="text" id="categoriesInput" class="tags-input" placeholder="Add category and press Enter..." />
                <div class="hint-text">Press Enter to add each category</div>
                <div class="tag-list" id="categoryList"></div>
            </div>
        </div>

        <!-- Right Editor Area -->
        <div class="editor-container">
            <div class="editor-header">
                <h1>Blog Post Editor</h1>
            </div>
            <div class="editor-content" id="editorContentArea">
                <div id="htmlEditorContainer">
                    <textarea id="editor"></textarea>
                </div>
                <div id="markdownEditorContainer">
                    <textarea id="markdownEditor"></textarea>
                </div>
            </div>
            <div class="button-container">
                <button id="saveBtn" class="secondary">Save Draft</button>
                <button id="publishBtn">Publish Post</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js" referrerpolicy="origin" nonce="${nonce}"></script>
    <script src="https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.js" nonce="${nonce}"></script>
    <script nonce="${nonce}">
        ${draftDataScript}
        ${blogConfigsScript}
        const vscode = acquireVsCodeApi();
        
        // Initialize tag and category arrays
        let tags = [];
        let categories = [];

        // Editor mode
        let contentFormat = 'html';
        let easyMDE = null;
        
        // Blog configurations will be injected by VS Code
        window.blogConfigs = window.blogConfigs || [];

        // Initialize TinyMCE
        tinymce.init({
            selector: '#editor',
            license_key: 'gpl',
            height: '100%',
            menubar: true,
            plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; padding: 10px; }',
            setup: function(editor) {
                editor.on('change', function() {
                    savePostData();
                });
            }
        });

        function ensureEasyMDE() {
            if (easyMDE) {
                return;
            }
            if (typeof EasyMDE === 'undefined') {
                console.error('EasyMDE failed to load (CDN).');
                return;
            }
            const textarea = document.getElementById('markdownEditor');
            easyMDE = new EasyMDE({
                element: textarea,
                autofocus: false,
                spellChecker: false,
                status: ['lines', 'words', 'cursor'],
                toolbar: [
                    'bold', 'italic', 'heading', '|',
                    'quote', 'unordered-list', 'ordered-list', '|',
                    'link', 'image', 'code', '|',
                    'preview', 'side-by-side', 'fullscreen', '|',
                    'guide'
                ],
                shortcuts: {
                    toggleFullScreen: null
                }
            });

            // Track changes
            easyMDE.codemirror.on('change', function() {
                savePostData();
            });
        }

        function getActiveContent() {
            if (contentFormat === 'markdown') {
                if (easyMDE) {
                    return easyMDE.value();
                }
                return document.getElementById('markdownEditor').value || '';
            }
            return tinymce.get('editor') ? tinymce.get('editor').getContent() : '';
        }

        function setActiveContent(value) {
            const content = value || '';
            if (contentFormat === 'markdown') {
                ensureEasyMDE();
                if (easyMDE) {
                    easyMDE.value(content);
                } else {
                    document.getElementById('markdownEditor').value = content;
                }
                return;
            }

            if (tinymce.get('editor')) {
                tinymce.get('editor').setContent(content);
            } else {
                const checkEditor = setInterval(() => {
                    if (tinymce.get('editor')) {
                        tinymce.get('editor').setContent(content);
                        clearInterval(checkEditor);
                    }
                }, 100);
            }
        }

        function applyContentFormat(newFormat) {
            const htmlContainer = document.getElementById('htmlEditorContainer');
            const mdContainer = document.getElementById('markdownEditorContainer');
            const editorContentArea = document.getElementById('editorContentArea');

            const previousContent = getActiveContent();
            contentFormat = (newFormat === 'markdown') ? 'markdown' : 'html';

            if (contentFormat === 'markdown') {
                htmlContainer.style.display = 'none';
                mdContainer.style.display = 'block';
                editorContentArea.classList.add('markdown-mode');
                ensureEasyMDE();
            } else {
                mdContainer.style.display = 'none';
                htmlContainer.style.display = 'block';
                editorContentArea.classList.remove('markdown-mode');
            }

            // Preserve content across mode switches (no conversion yet)
            setActiveContent(previousContent);
            savePostData();
        }

        // Tag management
        document.getElementById('tagsInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const input = e.target;
                const tag = input.value.trim();
                if (tag && !tags.includes(tag)) {
                    tags.push(tag);
                    renderTags();
                    input.value = '';
                    savePostData();
                }
            }
        });

        function renderTags() {
            const tagList = document.getElementById('tagList');
            tagList.innerHTML = tags.map((tag, index) => 
                \`<div class="tag-item">
                    <span>\${tag}</span>
                    <span class="tag-remove" onclick="removeTag(\${index})">×</span>
                </div>\`
            ).join('');
        }

        window.removeTag = function(index) {
            tags.splice(index, 1);
            renderTags();
            savePostData();
        };

        // Category management
        document.getElementById('categoriesInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const input = e.target;
                const category = input.value.trim();
                if (category && !categories.includes(category)) {
                    categories.push(category);
                    renderCategories();
                    input.value = '';
                    savePostData();
                }
            }
        });

        function renderCategories() {
            const categoryList = document.getElementById('categoryList');
            categoryList.innerHTML = categories.map((category, index) => 
                \`<div class="tag-item">
                    <span>\${category}</span>
                    <span class="tag-remove" onclick="removeCategory(\${index})">×</span>
                </div>\`
            ).join('');
        }

        window.removeCategory = function(index) {
            categories.splice(index, 1);
            renderCategories();
            savePostData();
        };

        // Populate blog selection dropdown
        function populateBlogSelection() {
            const blogSelect = document.getElementById('selectedBlog');
            blogSelect.innerHTML = '<option value="">-- Select a blog --</option>';
            
            if (window.blogConfigs && window.blogConfigs.length > 0) {
                window.blogConfigs.forEach(blog => {
                    const option = document.createElement('option');
                    option.value = blog.name;
                    option.textContent = \`\${blog.name} (\${blog.platform})\`;
                    blogSelect.appendChild(option);
                });
                
                // Set default blog if configured and not already set by draft data
                if (window.defaultBlog && !blogSelect.value) {
                    blogSelect.value = window.defaultBlog;
                }
            }
        }

        // Save post data to extension
        function savePostData() {
            const title = document.getElementById('postTitle').value;
            const content = getActiveContent();
            const publishDate = document.getElementById('publishDate').value;
            const excerpt = document.getElementById('postExcerpt').value;
            const status = document.getElementById('postStatus').value;
            const selectedBlog = document.getElementById('selectedBlog').value;
            const format = document.getElementById('contentFormat').value;
            
            vscode.postMessage({
                command: 'savePostData',
                title: title,
                content: content,
                contentFormat: (format === 'markdown') ? 'markdown' : 'html',
                publishDate: publishDate || undefined,
                tags: tags,
                categories: categories,
                excerpt: excerpt || undefined,
                status: status,
                selectedBlog: selectedBlog || undefined
            });
        }

        // Handle save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            console.log('Save button clicked');
            savePostData();
            vscode.postMessage({
                command: 'info',
                text: 'Draft saved locally'
            });
        });

        // Handle publish button
        document.getElementById('publishBtn').addEventListener('click', () => {
            console.log('Publish button clicked');
            savePostData();
            // Give some time for the message to be processed
            setTimeout(() => {
                console.log('Sending publish command');
                vscode.postMessage({
                    command: 'publish'
                });
            }, 100);
        });

        // Listen for changes on all metadata fields
        document.getElementById('selectedBlog').addEventListener('change', savePostData);
        document.getElementById('postTitle').addEventListener('input', savePostData);
        document.getElementById('contentFormat').addEventListener('change', (e) => {
            applyContentFormat(e.target.value);
        });
        document.getElementById('postStatus').addEventListener('change', savePostData);
        document.getElementById('publishDate').addEventListener('change', savePostData);
        document.getElementById('postExcerpt').addEventListener('input', savePostData);

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'getPostData':
                    savePostData();
                    break;
            }
        });

        // Auto-save periodically
        setInterval(savePostData, 30000); // Every 30 seconds

        // Load draft data if available
        function loadDraftData(draftData) {
            if (!draftData) return;

            const initialFormat = (draftData.contentFormat === 'markdown') ? 'markdown' : 'html';
            document.getElementById('contentFormat').value = initialFormat;
            applyContentFormat(initialFormat);
            
            if (draftData.selectedBlog) {
                document.getElementById('selectedBlog').value = draftData.selectedBlog;
            }
            document.getElementById('postTitle').value = draftData.title || '';
            document.getElementById('postStatus').value = draftData.status || 'draft';
            document.getElementById('publishDate').value = draftData.publishDate || '';
            document.getElementById('postExcerpt').value = draftData.excerpt || '';
            
            // Load tags
            tags = draftData.tags || [];
            renderTags();
            
            // Load categories
            categories = draftData.categories || [];
            renderCategories();
            
            setActiveContent(draftData.content || '');
        }

        // Initialize blog selection
        populateBlogSelection();

        // Check if we have draft data from VS Code
        window.draftData = window.draftData || null;
        if (window.draftData) {
            loadDraftData(window.draftData);
        } else {
            // Default content format for new drafts
            const initialFormat = document.getElementById('contentFormat').value || 'html';
            applyContentFormat(initialFormat);
        }
    </script>
</body>
</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
