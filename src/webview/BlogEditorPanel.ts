import * as vscode from 'vscode';

export class BlogEditorPanel {
    public static currentPanel: BlogEditorPanel | undefined;
    public static readonly viewType = 'blogEditor';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _postData: { title: string; content: string } | null = null;

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
                            content: message.content
                        };
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public async getPostData(): Promise<{ title: string; content: string } | null> {
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
        .container {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .title-input {
            width: 100%;
            padding: 10px;
            font-size: 24px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            margin-bottom: 20px;
            box-sizing: border-box;
        }
        .title-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        .editor-container {
            background-color: white;
            padding: 10px;
            border-radius: 4px;
        }
        .button-container {
            margin-top: 20px;
            display: flex;
            gap: 10px;
        }
        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Blog Post Editor</h1>
        <input type="text" id="postTitle" class="title-input" placeholder="Enter post title..." />
        <div class="editor-container">
            <textarea id="editor"></textarea>
        </div>
        <div class="button-container">
            <button id="saveBtn">Save Draft</button>
            <button id="publishBtn">Publish Post</button>
        </div>
    </div>

    <script src="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js" referrerpolicy="origin" nonce="${nonce}"></script>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // Initialize TinyMCE
        tinymce.init({
            selector: '#editor',
            height: 500,
            menubar: true,
            plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
            setup: function(editor) {
                editor.on('change', function() {
                    savePostData();
                });
            }
        });

        // Save post data to extension
        function savePostData() {
            const title = document.getElementById('postTitle').value;
            const content = tinymce.get('editor').getContent();
            
            vscode.postMessage({
                command: 'savePostData',
                title: title,
                content: content
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

        // Listen for title changes
        document.getElementById('postTitle').addEventListener('input', () => {
            savePostData();
        });

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
