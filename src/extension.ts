import * as vscode from 'vscode';
import { BlogEditorPanel } from './webview/BlogEditorPanel';
import { WordPressService } from './services/WordPressService';
import { BloggerService } from './services/BloggerService';

export function activate(context: vscode.ExtensionContext) {
    console.log('Live Blog Writer extension is now active!');

    // Register command to create a new blog post
    let newPostCommand = vscode.commands.registerCommand('live-blog-writer.newPost', () => {
        BlogEditorPanel.createOrShow(context.extensionUri);
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
                await publishToWordPress(postData, config);
            } else if (platform === 'blogger') {
                await publishToBlogger(postData, config);
            } else {
                vscode.window.showErrorMessage(`Unsupported platform: ${platform}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to publish post: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(newPostCommand, publishPostCommand);
}

async function publishToWordPress(postData: any, config: vscode.WorkspaceConfiguration) {
    const url = config.get<string>('wordpress.url');
    const username = config.get<string>('wordpress.username');
    const password = config.get<string>('wordpress.applicationPassword');

    if (!url || !username || !password) {
        vscode.window.showErrorMessage('WordPress configuration is incomplete. Please configure your WordPress settings.');
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

async function publishToBlogger(postData: any, config: vscode.WorkspaceConfiguration) {
    const blogId = config.get<string>('blogger.blogId');
    const apiKey = config.get<string>('blogger.apiKey');

    if (!blogId || !apiKey) {
        vscode.window.showErrorMessage('Blogger configuration is incomplete. Please configure your Blogger settings.');
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
