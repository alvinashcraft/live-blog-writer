import * as vscode from 'vscode';
import { BlogEditorPanel } from './webview/BlogEditorPanel';
import { WordPressService } from './services/WordPressService';
import { BloggerService } from './services/BloggerService';
import { DraftManager, DraftMetadata } from './services/DraftManager';
import { GoogleOAuthService } from './services/GoogleOAuthService';

const WORDPRESS_PASSWORD_KEY = 'liveBlogWriter.wordpress.password';

// Interfaces for publish options
interface WordPressPublishOptions {
    status?: string;
    date?: string;
    excerpt?: string;
    tags?: string[];
    categories?: string[];
}

interface BloggerPublishOptions {
    published?: string;
    labels?: string[];
    isDraft?: boolean;
}

let draftManager: DraftManager;
let googleOAuthService: GoogleOAuthService;

export function activate(context: vscode.ExtensionContext) {
    console.log('Live Blog Writer extension is now active!');
    
    // Initialize draft manager and OAuth service
    draftManager = new DraftManager();
    googleOAuthService = new GoogleOAuthService(context);

    // Register command to create a new blog post
    let newPostCommand = vscode.commands.registerCommand('live-blog-writer.newPost', () => {
        BlogEditorPanel.createOrShow(context.extensionUri, draftManager);
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

    // Register command to set custom Blogger OAuth credentials (optional - for advanced users)
    let setBloggerClientIdCommand = vscode.commands.registerCommand('live-blog-writer.setBloggerClientId', async () => {
        const isUsingCustom = await googleOAuthService.isUsingCustomCredentials();
        
        if (isUsingCustom) {
            const action = await vscode.window.showWarningMessage(
                'You are currently using custom OAuth credentials. What would you like to do?',
                'Update Credentials',
                'Revert to Default',
                'Cancel'
            );

            if (action === 'Revert to Default') {
                await googleOAuthService.clearCustomClientCredentials();
                await googleOAuthService.clearAuthentication();
                vscode.window.showInformationMessage('Reverted to default OAuth credentials. Please re-authenticate.');
                return;
            } else if (action !== 'Update Credentials') {
                return;
            }
        } else {
            const proceed = await vscode.window.showInformationMessage(
                'This extension comes with built-in OAuth credentials. You only need custom credentials if you want to use your own Google Cloud project.\n\nDo you want to set up custom credentials?',
                'Yes',
                'No'
            );

            if (proceed !== 'Yes') {
                return;
            }
        }

        const clientId = await vscode.window.showInputBox({
            prompt: 'Enter your Google OAuth Client ID',
            placeHolder: 'your-client-id.apps.googleusercontent.com',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Client ID cannot be empty';
                }
                return null;
            }
        });

        if (!clientId) {
            return;
        }

        const clientSecret = await vscode.window.showInputBox({
            prompt: 'Enter your Google OAuth Client Secret',
            placeHolder: 'GOCSPX-...',
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Client Secret cannot be empty';
                }
                return null;
            }
        });

        if (!clientSecret) {
            return;
        }

        await googleOAuthService.setCustomClientCredentials(clientId, clientSecret);
        await googleOAuthService.clearAuthentication();
        vscode.window.showInformationMessage('Custom OAuth credentials saved. Please re-authenticate with your credentials.');
    });

    // Register command to authenticate with Google for Blogger
    let authenticateBloggerCommand = vscode.commands.registerCommand('live-blog-writer.authenticateBlogger', async () => {
        try {
            await googleOAuthService.authenticate();
            vscode.window.showInformationMessage('Successfully authenticated with Google for Blogger!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to authenticate: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Register command to open recent drafts
    let openRecentDraftCommand = vscode.commands.registerCommand('live-blog-writer.openRecentDraft', async () => {
        try {
            const recentDrafts = await draftManager.getRecentDrafts(20);
            
            if (recentDrafts.length === 0) {
                vscode.window.showInformationMessage('No recent drafts found.');
                return;
            }

            // Create quick pick items with draft info
            const quickPickItems = recentDrafts.map(draft => ({
                label: draft.title || 'Untitled Draft',
                description: `${draft.wordCount} words`,
                detail: `Last modified: ${draft.updatedAt.toLocaleDateString()} ${draft.updatedAt.toLocaleTimeString()}`,
                draft: draft
            }));

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a draft to open',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                const draftContent = await draftManager.loadDraft(selected.draft.id);
                if (draftContent) {
                    BlogEditorPanel.createOrShow(context.extensionUri, draftManager, draftContent);
                } else {
                    vscode.window.showErrorMessage('Failed to load the selected draft.');
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load recent drafts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Register command to manage drafts
    let manageDraftsCommand = vscode.commands.registerCommand('live-blog-writer.manageDrafts', async () => {
        try {
            const allDrafts = await draftManager.listDrafts();
            
            if (allDrafts.length === 0) {
                const action = await vscode.window.showInformationMessage('No drafts found.', 'Create New Post');
                if (action === 'Create New Post') {
                    vscode.commands.executeCommand('live-blog-writer.newPost');
                }
                return;
            }

            // Create quick pick items with management options
            const quickPickItems = [
                { label: '$(folder-opened) Open Drafts Folder', description: 'Open the drafts folder in file explorer', action: 'openFolder' },
                { label: '$(trash) Cleanup Old Drafts', description: 'Delete drafts older than 30 days', action: 'cleanup' },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                ...allDrafts.map(draft => ({
                    label: draft.title || 'Untitled Draft',
                    description: `${draft.wordCount} words`,
                    detail: `Last modified: ${draft.updatedAt.toLocaleDateString()} ${draft.updatedAt.toLocaleTimeString()}`,
                    action: 'open',
                    draft: draft
                }))
            ];

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select an action or draft to open',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                switch (selected.action) {
                    case 'openFolder':
                        const folderUri = vscode.Uri.file(draftManager.getDraftsFolder());
                        await vscode.env.openExternal(folderUri);
                        break;
                    
                    case 'cleanup':
                        const confirm = await vscode.window.showWarningMessage(
                            'Delete all drafts older than 30 days?',
                            { modal: true },
                            'Delete'
                        );
                        if (confirm === 'Delete') {
                            const deletedCount = await draftManager.cleanupOldDrafts(30);
                            vscode.window.showInformationMessage(`Deleted ${deletedCount} old drafts.`);
                        }
                        break;
                    
                    case 'open':
                        if ('draft' in selected && selected.draft) {
                            const draftContent = await draftManager.loadDraft((selected as any).draft.id);
                            if (draftContent) {
                                BlogEditorPanel.createOrShow(context.extensionUri, draftManager, draftContent);
                            } else {
                                vscode.window.showErrorMessage('Failed to load the selected draft.');
                            }
                        }
                        break;
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to manage drafts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Register command to save current draft
    let saveDraftCommand = vscode.commands.registerCommand('live-blog-writer.saveDraft', async () => {
        const panel = BlogEditorPanel.currentPanel;
        if (!panel) {
            vscode.window.showErrorMessage('No blog post is currently open.');
            return;
        }

        try {
            await panel.saveDraftManually();
            vscode.window.showInformationMessage('Draft saved successfully.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(
        newPostCommand, 
        publishPostCommand, 
        setWordPressPasswordCommand, 
        setBloggerClientIdCommand,
        authenticateBloggerCommand,
        openRecentDraftCommand,
        manageDraftsCommand,
        saveDraftCommand
    );
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
    
    const options: WordPressPublishOptions = {
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

    if (!blogId) {
        vscode.window.showErrorMessage('Blogger Blog ID is not configured. Please configure it in settings.');
        return;
    }

    // Get Google OAuth token for Blogger API
    let accessToken;
    try {
        accessToken = await googleOAuthService.authenticate();
    } catch (error) {
        vscode.window.showErrorMessage(
            `Failed to authenticate with Google: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            'Please run the "Live Blog Writer: Authenticate with Blogger" command to sign in.'
        );
        return;
    }

    const service = new BloggerService(blogId, accessToken);
    
    const options: BloggerPublishOptions = {};

    // Set draft status based on post status
    // Blogger API uses isDraft parameter: true for draft, false for published
    const status = postData.status || 'draft';
    options.isDraft = (status === 'draft');

    // Handle publish date - only set if status is 'publish' (published)
    // For drafts, we don't set a publish date even if one is selected because:
    // 1. The Blogger API ignores the 'published' field for drafts (isDraft=true)
    // 2. This prevents confusion - drafts should be explicitly published to become scheduled posts
    // For published posts, convert datetime-local format to RFC 3339
    if (postData.publishDate && status === 'publish') {
        try {
            // Convert datetime-local format (YYYY-MM-DDTHH:mm) to RFC 3339
            const parsedDate = new Date(postData.publishDate);
            if (!isNaN(parsedDate.getTime())) {
                options.published = parsedDate.toISOString();
            }
        } catch (error) {
            console.error('Invalid publish date format:', postData.publishDate);
        }
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
    
    const statusMessage = options.isDraft ? 'saved as draft' : 'published';
    vscode.window.showInformationMessage(`Post ${statusMessage} successfully to Blogger! Post ID: ${result.id}`);
}

export function deactivate() {}
