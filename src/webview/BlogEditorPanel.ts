import * as vscode from 'vscode';
import { DraftManager, DraftContent } from '../services/DraftManager';
import { WordPressService } from '../services/WordPressService';
import { BloggerService } from '../services/BloggerService';
import { GhostService } from '../services/GhostService';
import { SubstackService } from '../services/SubstackService';
import { DevToService } from '../services/DevToService';

// Helper function to get the secret key for a blog
function getSecretKey(platform: string, blogName: string, credentialType: string): string {
    return `liveBlogWriter.${platform}.${blogName}.${credentialType}`;
}

export class BlogEditorPanel {
    public static currentPanel: BlogEditorPanel | undefined;
    public static readonly viewType = 'blogEditor';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _draftManager: DraftManager;
    private readonly _context: vscode.ExtensionContext | undefined;
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
        publishedPostId?: string | number;
        blogName?: string;
        isEditDraft?: boolean;
        postUrl?: string;
    } | null = null;
    private _currentDraftId: string | undefined;
    private _autoSaveInterval: NodeJS.Timeout | undefined;
    private _showPostSelectorOnLoad: boolean = false;

    public static createOrShow(extensionUri: vscode.Uri, draftManager?: DraftManager, draftContent?: DraftContent, context?: vscode.ExtensionContext, showPostSelector?: boolean) {
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
            // Show post selector if requested
            if (showPostSelector) {
                BlogEditorPanel.currentPanel._panel.webview.postMessage({ command: 'showPostSelector' });
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

        BlogEditorPanel.currentPanel = new BlogEditorPanel(panel, extensionUri, draftManager, draftContent, context, showPostSelector);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, draftManager?: DraftManager, draftContent?: DraftContent, context?: vscode.ExtensionContext, showPostSelector?: boolean) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._draftManager = draftManager || new DraftManager();
        this._context = context;
        this._showPostSelectorOnLoad = showPostSelector || false;

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
                            selectedBlog: message.selectedBlog,
                            publishedPostId: message.publishedPostId,
                            isEditDraft: message.isEditDraft,
                            blogName: message.blogName,
                            postUrl: message.postUrl
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
                    case 'fetchPostsForBlog':
                        // Fetch posts for a specific blog
                        this.handleFetchPosts(message.blogName);
                        return;
                    case 'loadPublishedPost':
                        // Load a specific published post into the editor
                        this.handleLoadPublishedPost(message.blogName, message.postId);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async handleFetchPosts(blogName: string) {
        if (!this._context) {
            this._panel.webview.postMessage({ 
                command: 'postsLoaded', 
                blogName, 
                posts: [], 
                error: 'Extension context not available' 
            });
            return;
        }

        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<any[]>('blogs', []);
        const selectedBlog = blogs.find(b => b.name === blogName);

        if (!selectedBlog) {
            this._panel.webview.postMessage({ 
                command: 'postsLoaded', 
                blogName, 
                posts: [], 
                error: 'Blog not found' 
            });
            return;
        }

        try {
            let posts: any[] = [];
            switch (selectedBlog.platform) {
                case 'wordpress':
                    const wpPassword = await this._context.secrets.get(getSecretKey('wordpress', selectedBlog.name, 'password'));
                    if (!wpPassword || !selectedBlog.id || !selectedBlog.username) {
                        throw new Error('WordPress credentials incomplete');
                    }
                    const wpService = new WordPressService(selectedBlog.id, selectedBlog.username, wpPassword);
                    posts = await wpService.getPosts(1, 10);
                    break;

                case 'blogger':
                    const bloggerToken = await this._context.secrets.get('liveBlogWriter.blogger.token');
                    if (!bloggerToken || !selectedBlog.id) {
                        throw new Error('Blogger authentication required');
                    }
                    const bloggerService = new BloggerService(selectedBlog.id, bloggerToken);
                    posts = await bloggerService.getPosts(10);
                    break;

                case 'ghost':
                    const ghostApiKey = await this._context.secrets.get(getSecretKey('ghost', selectedBlog.name, 'apikey'));
                    if (!ghostApiKey || !selectedBlog.id) {
                        throw new Error('Ghost API key not configured');
                    }
                    const ghostService = new GhostService(selectedBlog.id, ghostApiKey);
                    posts = await ghostService.getPosts(10);
                    break;

                case 'substack':
                    const substackCookie = await this._context.secrets.get(getSecretKey('substack', selectedBlog.name, 'apikey'));
                    const substackEmail = await this._context.secrets.get(getSecretKey('substack', selectedBlog.name, 'email'));
                    const substackPassword = await this._context.secrets.get(getSecretKey('substack', selectedBlog.name, 'password'));
                    
                    if (!selectedBlog.id) {
                        throw new Error('Substack hostname not configured');
                    }
                    
                    let substackAuth: any;
                    if (substackCookie) {
                        substackAuth = { connectSid: substackCookie };
                    } else if (substackEmail && substackPassword) {
                        substackAuth = { email: substackEmail, password: substackPassword };
                    } else {
                        throw new Error('Substack credentials not configured');
                    }
                    
                    const substackService = new SubstackService(substackAuth, selectedBlog.id);
                    posts = await substackService.getPosts(10);
                    break;

                case 'devto':
                    const devtoApiKey = await this._context.secrets.get(getSecretKey('devto', selectedBlog.name, 'apikey'));
                    if (!devtoApiKey) {
                        throw new Error('Dev.to API key not configured');
                    }
                    const devtoService = new DevToService(devtoApiKey);
                    posts = await devtoService.getPosts(1, 10);
                    break;

                default:
                    throw new Error(`Platform ${selectedBlog.platform} not supported`);
            }

            // Normalize posts for the UI
            const normalizedPosts = posts.map((post: any) => ({
                id: post.id,
                title: post.title?.rendered || post.title || 'Untitled',
                date: post.date || post.published || post.published_at || post.post_date || '',
                status: post.status || 'published'
            }));

            this._panel.webview.postMessage({ 
                command: 'postsLoaded', 
                blogName, 
                posts: normalizedPosts,
                platform: selectedBlog.platform
            });
        } catch (error) {
            this._panel.webview.postMessage({ 
                command: 'postsLoaded', 
                blogName, 
                posts: [], 
                error: error instanceof Error ? error.message : 'Failed to fetch posts' 
            });
        }
    }

    private async handleLoadPublishedPost(blogName: string, postId: string | number) {
        if (!this._context) {
            vscode.window.showErrorMessage('Extension context not available');
            return;
        }

        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<any[]>('blogs', []);
        const selectedBlog = blogs.find(b => b.name === blogName);

        if (!selectedBlog) {
            vscode.window.showErrorMessage('Blog not found');
            return;
        }

        try {
            let fullPost: any;
            let tagNames: string[] = [];
            let categoryNames: string[] = [];
            
            switch (selectedBlog.platform) {
                case 'wordpress':
                    const wpPassword = await this._context.secrets.get(getSecretKey('wordpress', selectedBlog.name, 'password'));
                    if (!wpPassword || !selectedBlog.id || !selectedBlog.username) {
                        vscode.window.showErrorMessage('WordPress credentials incomplete. Please configure WordPress and try again.');
                        return;
                    }
                    const wpService = new WordPressService(selectedBlog.id, selectedBlog.username, wpPassword);
                    fullPost = await wpService.getPost(Number(postId));
                    
                    // Fetch tag and category names
                    if (fullPost.tags && fullPost.tags.length > 0) {
                        tagNames = await wpService.getTagNames(fullPost.tags);
                    }
                    if (fullPost.categories && fullPost.categories.length > 0) {
                        categoryNames = await wpService.getCategoryNames(fullPost.categories);
                    }
                    
                    // Attach names to the post for conversion
                    fullPost._tagNames = tagNames;
                    fullPost._categoryNames = categoryNames;
                    break;

                case 'blogger':
                    const bloggerToken = await this._context.secrets.get('liveBlogWriter.blogger.token');

                    if (!selectedBlog.id) {
                        vscode.window.showErrorMessage('Blogger blog ID is not configured.');
                        break;
                    }

                    if (!bloggerToken) {
                        vscode.window.showErrorMessage('Blogger authentication token not found. Please reconnect your Blogger account.');
                        break;
                    }

                    const bloggerService = new BloggerService(selectedBlog.id, bloggerToken);
                    fullPost = await bloggerService.getPost(String(postId));
                    break;

                case 'ghost':
                    if (!selectedBlog.id) {
                        vscode.window.showErrorMessage('Ghost blog ID is not configured. Please update your blog settings and try again.');
                        return;
                    }

                    const ghostApiKey = await this._context.secrets.get(getSecretKey('ghost', selectedBlog.name, 'apikey'));
                    if (!ghostApiKey) {
                        vscode.window.showErrorMessage('Ghost API key is not configured. Please set the Ghost API key before fetching posts.');
                        return;
                    }

                    const ghostService = new GhostService(selectedBlog.id, ghostApiKey);
                    fullPost = await ghostService.getPost(String(postId));
                    break;

                case 'substack':
                    if (!selectedBlog.id) {
                        vscode.window.showErrorMessage('Substack hostname not configured. Please update your blog settings and try again.');
                        return;
                    }
                    
                    const substackCookie = await this._context.secrets.get(getSecretKey('substack', selectedBlog.name, 'apikey'));
                    const substackEmail = await this._context.secrets.get(getSecretKey('substack', selectedBlog.name, 'email'));
                    const substackPassword = await this._context.secrets.get(getSecretKey('substack', selectedBlog.name, 'password'));
                    
                    let substackAuth: any;
                    if (substackCookie) {
                        substackAuth = { connectSid: substackCookie };
                    } else if (substackEmail && substackPassword) {
                        substackAuth = { email: substackEmail, password: substackPassword };
                    } else {
                        vscode.window.showErrorMessage('Substack credentials not configured. Please set up authentication and try again.');
                        return;
                    }
                    
                    const substackService = new SubstackService(substackAuth, selectedBlog.id);
                    fullPost = await substackService.getPost(Number(postId));
                    break;

                case 'devto':
                    const devtoApiKey = await this._context.secrets.get(getSecretKey('devto', selectedBlog.name, 'apikey'));
                    if (!devtoApiKey) {
                        vscode.window.showErrorMessage(`Dev.to API key not found for blog "${selectedBlog.name}". Please configure the credentials and try again.`);
                        return;
                    }
                    const devtoService = new DevToService(devtoApiKey);
                    fullPost = await devtoService.getPost(Number(postId));
                    break;
            }

            // Convert post to draft format
            const draftData = this.convertPostToDraft(fullPost, selectedBlog.platform, blogName);
            
            // Add the post URL if available
            if (fullPost.link) {
                draftData.postUrl = fullPost.link;
            } else if (fullPost.url) {
                draftData.postUrl = fullPost.url;
            } else if (fullPost.canonical_url) {
                draftData.postUrl = fullPost.canonical_url;
            }
            
            // Send to webview
            this._panel.webview.postMessage({ 
                command: 'loadDraftData', 
                draftData 
            });
            
            // Reset the load button
            this._panel.webview.postMessage({ 
                command: 'resetLoadButton'
            });

            // Update internal state
            this._postData = draftData;
            this._currentDraftId = undefined; // New edit, no draft ID yet
            this._panel.title = `Blog Editor - ${draftData.title || 'Untitled'}`;

            vscode.window.showInformationMessage(`Loaded: ${draftData.title}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load post: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private convertPostToDraft(post: any, platform: string, blogName: string): any {
        const baseContent: any = {
            publishedPostId: post.id,
            blogName: blogName,
            isEditDraft: true,
            selectedBlog: blogName
        };

        switch (platform) {
            case 'wordpress':
                return {
                    ...baseContent,
                    title: post.title?.rendered || '',
                    content: post.content?.rendered || '',
                    contentFormat: 'html',
                    excerpt: post.excerpt?.rendered || '',
                    status: post.status || 'publish',
                    publishDate: post.date || '',
                    tags: post._tagNames || [],
                    categories: post._categoryNames || []
                };
            
            case 'blogger':
                return {
                    ...baseContent,
                    title: post.title || '',
                    content: post.content || '',
                    contentFormat: 'html',
                    status: 'publish',
                    publishDate: post.published || '',
                    tags: post.labels || [],
                    categories: []
                };
            
            case 'ghost':
                return {
                    ...baseContent,
                    title: post.title || '',
                    content: post.html || '',
                    contentFormat: 'html',
                    excerpt: post.custom_excerpt || '',
                    status: post.status || 'published',
                    publishDate: post.published_at || '',
                    tags: post.tags?.map((t: any) => t.name) || [],
                    categories: []
                };
            
            case 'substack':
                return {
                    ...baseContent,
                    title: post.title || '',
                    content: post.body_html || '',
                    contentFormat: 'html',
                    excerpt: post.subtitle || '',
                    status: 'publish',
                    publishDate: post.post_date || '',
                    tags: [],
                    categories: []
                };
            
            case 'devto':
                return {
                    ...baseContent,
                    title: post.title || '',
                    content: post.body_markdown || '',
                    contentFormat: 'markdown',
                    excerpt: post.description || '',
                    status: post.published ? 'publish' : 'draft',
                    publishDate: post.published_at || '',
                    tags: post.tag_list || [],
                    categories: []
                };
            
            default:
                return baseContent;
        }
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
        /* Modal styles */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        .modal-overlay.active {
            display: flex;
        }
        .modal-content {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            width: 500px;
            max-width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        .modal-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--vscode-foreground);
            padding: 0;
            line-height: 1;
        }
        .modal-close:hover {
            color: var(--vscode-errorForeground);
        }
        .modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }
        .modal-body .form-group {
            margin-bottom: 15px;
        }
        .post-list {
            list-style: none;
            padding: 0;
            margin: 0;
            max-height: 300px;
            overflow-y: auto;
        }
        .post-list-item {
            padding: 12px 15px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: background-color 0.15s;
        }
        .post-list-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .post-list-item.selected {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
        }
        .post-title {
            font-weight: 500;
            margin-bottom: 4px;
        }
        .post-date {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .loading-spinner {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        .error-message {
            color: var(--vscode-errorForeground);
            padding: 10px;
            text-align: center;
        }
        .no-posts {
            color: var(--vscode-descriptionForeground);
            padding: 20px;
            text-align: center;
        }
        .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: flex-end;
            gap: 10px;
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
                <button id="loadPublishedBtn" class="secondary"><i class="fas fa-download"></i> Load Published Post</button>
                <button id="saveBtn" class="secondary">Save Draft</button>
                <button id="publishBtn">Publish Post</button>
            </div>
        </div>
    </div>

    <!-- Post Selector Modal -->
    <div id="postSelectorModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Load Published Post</h3>
                <button class="modal-close" id="modalCloseBtn">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="modalBlogSelect">Select Blog</label>
                    <select id="modalBlogSelect">
                        <option value="">-- Select a blog --</option>
                    </select>
                </div>
                <div id="postListContainer">
                    <div class="no-posts">Select a blog to load its published posts</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="secondary" id="modalCancelBtn">Cancel</button>
                <button id="loadSelectedPostBtn" disabled>Load Post</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js" referrerpolicy="origin" nonce="${nonce}"></script>
    <script src="https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.js" nonce="${nonce}"></script>
    <script nonce="${nonce}">
        ${draftDataScript}
        ${blogConfigsScript}
        const showPostSelectorOnLoad = ${this._showPostSelectorOnLoad};
        const vscode = acquireVsCodeApi();
        
        // Initialize tag and category arrays
        let tags = [];
        let categories = [];

        // Edit mode tracking
        let publishedPostId = null;
        let isEditDraft = false;
        let editBlogName = null;
        let postUrl = null;

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
                selectedBlog: selectedBlog || undefined,
                publishedPostId: publishedPostId || undefined,
                isEditDraft: isEditDraft || false,
                blogName: editBlogName || undefined,
                postUrl: postUrl || undefined
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
                case 'showPostSelector':
                    openPostSelector();
                    break;
                case 'postsLoaded':
                    handlePostsLoaded(message);
                    break;
                case 'loadDraftData':
                    loadDraftData(message.draftData);
                    closePostSelector();
                    break;
                case 'resetLoadButton':
                    const loadBtn = document.getElementById('loadSelectedPostBtn');
                    loadBtn.textContent = 'Load Post';
                    loadBtn.disabled = true;
                    break;
            }
        });

        // Post selector modal state
        let selectedPostId = null;
        let selectedBlogForModal = null;
        let loadedPosts = [];

        // Open post selector modal
        function openPostSelector() {
            const modal = document.getElementById('postSelectorModal');
            const modalBlogSelect = document.getElementById('modalBlogSelect');
            
            // Populate blog dropdown
            modalBlogSelect.innerHTML = '<option value="">-- Select a blog --</option>';
            if (window.blogConfigs && window.blogConfigs.length > 0) {
                window.blogConfigs.forEach(blog => {
                    const option = document.createElement('option');
                    option.value = blog.name;
                    option.textContent = \`\${blog.name} (\${blog.platform})\`;
                    modalBlogSelect.appendChild(option);
                });
            }
            
            // Reset state
            selectedPostId = null;
            selectedBlogForModal = null;
            loadedPosts = [];
            document.getElementById('postListContainer').innerHTML = '<div class="no-posts">Select a blog to load its published posts</div>';
            document.getElementById('loadSelectedPostBtn').disabled = true;
            
            modal.classList.add('active');
        }

        window.openPostSelector = openPostSelector;

        // Close post selector modal
        function closePostSelector() {
            document.getElementById('postSelectorModal').classList.remove('active');
        }

        window.closePostSelector = closePostSelector;

        // Handle blog selection in modal
        document.getElementById('modalBlogSelect').addEventListener('change', (e) => {
            const blogName = e.target.value;
            selectedBlogForModal = blogName;
            selectedPostId = null;
            document.getElementById('loadSelectedPostBtn').disabled = true;
            
            if (!blogName) {
                document.getElementById('postListContainer').innerHTML = '<div class="no-posts">Select a blog to load its published posts</div>';
                return;
            }
            
            // Show loading
            document.getElementById('postListContainer').innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';
            
            // Request posts from extension
            vscode.postMessage({
                command: 'fetchPostsForBlog',
                blogName: blogName
            });
        });

        // Handle posts loaded from extension
        function handlePostsLoaded(message) {
            const container = document.getElementById('postListContainer');
            
            if (message.error) {
                container.innerHTML = \`<div class="error-message">\${message.error}</div>\`;
                return;
            }
            
            if (!message.posts || message.posts.length === 0) {
                container.innerHTML = '<div class="no-posts">No published posts found</div>';
                return;
            }
            
            loadedPosts = message.posts;
            
            const listHtml = '<ul class="post-list">' + message.posts.map(post => {
                const dateStr = post.date ? new Date(post.date).toLocaleDateString() : '';
                return \`<li class="post-list-item" data-id="\${post.id}">
                    <div class="post-title">\${escapeHtml(post.title)}</div>
                    <div class="post-date">\${dateStr}</div>
                </li>\`;
            }).join('') + '</ul>';
            
            container.innerHTML = listHtml;
            
            // Add click listeners to post items
            container.querySelectorAll('.post-list-item').forEach(item => {
                item.addEventListener('click', () => {
                    selectPost(item.getAttribute('data-id'));
                });
            });
        }

        // Escape HTML for safe display
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Select a post in the list
        function selectPost(postId) {
            selectedPostId = postId;
            
            // Update UI
            document.querySelectorAll('.post-list-item').forEach(item => {
                item.classList.remove('selected');
            });
            const selectedItem = document.querySelector(\`.post-list-item[data-id="\${postId}"]\`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
            
            document.getElementById('loadSelectedPostBtn').disabled = false;
        }

        window.selectPost = selectPost;

        // Handle load selected post button
        document.getElementById('loadSelectedPostBtn').addEventListener('click', () => {
            if (!selectedPostId || !selectedBlogForModal) return;
            
            // Show loading state
            document.getElementById('loadSelectedPostBtn').disabled = true;
            document.getElementById('loadSelectedPostBtn').textContent = 'Loading...';
            
            vscode.postMessage({
                command: 'loadPublishedPost',
                blogName: selectedBlogForModal,
                postId: selectedPostId
            });
        });

        // Handle load published post button
        document.getElementById('loadPublishedBtn').addEventListener('click', () => {
            openPostSelector();
        });

        // Handle modal close button
        document.getElementById('modalCloseBtn').addEventListener('click', () => {
            closePostSelector();
        });

        // Handle modal cancel button
        document.getElementById('modalCancelBtn').addEventListener('click', () => {
            closePostSelector();
        });

        // Handle clicking outside modal to close
        document.getElementById('postSelectorModal').addEventListener('click', (e) => {
            if (e.target.id === 'postSelectorModal') {
                closePostSelector();
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
            
            // Load edit mode fields
            publishedPostId = draftData.publishedPostId || null;
            isEditDraft = draftData.isEditDraft || false;
            editBlogName = draftData.blogName || null;
            postUrl = draftData.postUrl || null;
            
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

        // Auto-open post selector if requested
        if (showPostSelectorOnLoad) {
            setTimeout(() => {
                openPostSelector();
            }, 500);
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
