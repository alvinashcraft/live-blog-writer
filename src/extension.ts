import * as vscode from 'vscode';
import { BlogEditorPanel } from './webview/BlogEditorPanel';
import { WordPressService } from './services/WordPressService';
import { BloggerService } from './services/BloggerService';

const WORDPRESS_PASSWORD_KEY = 'liveBlogWriter.wordpress.password';
const BLOGGER_API_KEY = 'liveBlogWriter.blogger.apiKey';

export function activate(context: vscode.ExtensionContext) {
    console.log('Live Blog Writer extension is now active!');

    // Register command to create a new blog post
    let newPostCommand = vscode.commands.registerCommand('live-blog-writer.newPost', () => {
        BlogEditorPanel.createOrShow(context.extensionUri);
    });

    // Register command to set WordPress password
    let setWordPressPasswordCommand = vscode.commands.registerCommand('live-blog-writer.setWordPressPassword', async () => {
        const password = await vscode.window.showInputBox({
            prompt: 'Enter your WordPress application password',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'WordPress application password'
        });

        if (password) {
            await context.secrets.store(WORDPRESS_PASSWORD_KEY, password);
            vscode.window.showInformationMessage('WordPress password saved securely.');
        }
    });

    // Register command to set Blogger API key
    let setBloggerApiKeyCommand = vscode.commands.registerCommand('live-blog-writer.setBloggerApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Blogger API key',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'Blogger API key'
        });

        if (apiKey) {
            await context.secrets.store(BLOGGER_API_KEY, apiKey);
            vscode.window.showInformationMessage('Blogger API key saved securely.');
        }
    });

    // Register command to publish the current post
    let publishPostCommand = vscode.commands.registerCommand('live-blog-writer.publishPost', async () => {
        const panel = BlogEditorPanel.currentPanel;
        if (!panel) {
            vscode.window.showErrorMessage('No blog post is currently open. Please create a new post first.');
            return;
        }

        // Get the post content from the webview
        const postData = await panel.getPostData();
        if (!postData) {
            vscode.window.showErrorMessage('Failed to retrieve post data.');
            return;
        }

        // Get configuration
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const platform = config.get<string>('platform', 'wordpress');

        try {
            if (platform === 'wordpress') {
                await publishToWordPress(postData, config, context);
            } else if (platform === 'blogger') {
                await publishToBlogger(postData, config, context);
            } else {
                vscode.window.showErrorMessage(`Unsupported platform: ${platform}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to publish post: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(newPostCommand, publishPostCommand, setWordPressPasswordCommand, setBloggerApiKeyCommand);
}

async function publishToWordPress(postData: any, config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) {
    const url = config.get<string>('wordpress.url');
    const username = config.get<string>('wordpress.username');
    const password = await context.secrets.get(WORDPRESS_PASSWORD_KEY);

    if (!url || !username) {
        vscode.window.showErrorMessage('WordPress configuration is incomplete. Please configure your WordPress URL and username in settings.');
        return;
    }

    if (!password) {
        vscode.window.showErrorMessage('WordPress password not set. Please run "Live Blog Writer: Set WordPress Password" command first.');
        return;
    }

    const service = new WordPressService(url, username, password);
    
    const options: any = {
        status: postData.status || 'draft'
    };

    if (postData.publishDate) {
        options.date = postData.publishDate;
    }

    if (postData.excerpt) {
        options.excerpt = postData.excerpt;
    }

    if (postData.tags && postData.tags.length > 0) {
        options.tags = postData.tags;
    }

    if (postData.categories && postData.categories.length > 0) {
        options.categories = postData.categories;
    }

    const result = await service.createPost(postData.title, postData.content, options);
    
    vscode.window.showInformationMessage(`Post published successfully to WordPress! Post ID: ${result.id}`);
}

async function publishToBlogger(postData: any, config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) {
    const blogId = config.get<string>('blogger.blogId');
    const apiKey = await context.secrets.get(BLOGGER_API_KEY);

    if (!blogId) {
        vscode.window.showErrorMessage('Blogger Blog ID is not configured. Please configure it in settings.');
        return;
    }

    if (!apiKey) {
        vscode.window.showErrorMessage('Blogger API key not set. Please run "Live Blog Writer: Set Blogger API Key" command first.');
        return;
    }

    const service = new BloggerService(blogId, apiKey);
    
    const options: any = {};

    if (postData.publishDate) {
        options.published = postData.publishDate;
    }

    // Combine tags and categories as Blogger labels
    const labels: string[] = [];
    if (postData.tags && postData.tags.length > 0) {
        labels.push(...postData.tags);
    }
    if (postData.categories && postData.categories.length > 0) {
        labels.push(...postData.categories);
    }
    
    if (labels.length > 0) {
        options.labels = labels;
    }

    const result = await service.createPost(postData.title, postData.content, options);
    
    vscode.window.showInformationMessage(`Post published successfully to Blogger! Post ID: ${result.id}`);
}

export function deactivate() {}
