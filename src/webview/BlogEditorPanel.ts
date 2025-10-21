import * as vscode from 'vscode';

export class BlogEditorPanel {
    public static currentPanel: BlogEditorPanel | undefined;
    public static readonly viewType = 'blogEditor';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _postData: { 
        title: string; 
        content: string;
        publishDate?: string;
        tags?: string[];
        categories?: string[];
        excerpt?: string;
        status?: string;
    } | null = null;

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (BlogEditorPanel.currentPanel) {
            BlogEditorPanel.currentPanel._panel.reveal(column);
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

        BlogEditorPanel.currentPanel = new BlogEditorPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'savePostData':
                        this._postData = {
                            title: message.title,
                            content: message.content,
                            publishDate: message.publishDate,
                            tags: message.tags,
                            categories: message.categories,
                            excerpt: message.excerpt,
                            status: message.status
                        };
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
        publishDate?: string;
        tags?: string[];
        categories?: string[];
        excerpt?: string;
        status?: string;
    } | null> {
        // Request current data from webview
        await this._panel.webview.postMessage({ command: 'getPostData' });
        
        // Wait a bit for the response
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return this._postData;
    }

    public dispose() {
        BlogEditorPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' https://cdn.tiny.cloud; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.tiny.cloud; font-src ${webview.cspSource} https://cdn.tiny.cloud; img-src ${webview.cspSource} https: data:;">
    <title>Blog Editor</title>
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
                <label for="postTitle">Title *</label>
                <input type="text" id="postTitle" placeholder="Enter post title..." required />
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
            <div class="editor-content">
                <textarea id="editor"></textarea>
            </div>
            <div class="button-container">
                <button id="saveBtn" class="secondary">Save Draft</button>
                <button id="publishBtn">Publish Post</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js" referrerpolicy="origin" nonce="${nonce}"></script>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // Initialize tag and category arrays
        let tags = [];
        let categories = [];

        // Initialize TinyMCE
        tinymce.init({
            selector: '#editor',
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

        // Save post data to extension
        function savePostData() {
            const title = document.getElementById('postTitle').value;
            const content = tinymce.get('editor') ? tinymce.get('editor').getContent() : '';
            const publishDate = document.getElementById('publishDate').value;
            const excerpt = document.getElementById('postExcerpt').value;
            const status = document.getElementById('postStatus').value;
            
            vscode.postMessage({
                command: 'savePostData',
                title: title,
                content: content,
                publishDate: publishDate || undefined,
                tags: tags,
                categories: categories,
                excerpt: excerpt || undefined,
                status: status
            });
        }

        // Handle save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            savePostData();
            vscode.postMessage({
                command: 'info',
                text: 'Draft saved locally'
            });
        });

        // Handle publish button
        document.getElementById('publishBtn').addEventListener('click', () => {
            savePostData();
            // Give some time for the message to be processed
            setTimeout(() => {
                vscode.postMessage({
                    command: 'publish'
                });
            }, 100);
        });

        // Listen for changes on all metadata fields
        document.getElementById('postTitle').addEventListener('input', savePostData);
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
