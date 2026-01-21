import * as vscode from 'vscode';
import { BlogEditorPanel } from './webview/BlogEditorPanel';
import { BlogConnectionsPanel } from './webview/BlogConnectionsPanel';
import { WordPressService } from './services/WordPressService';
import { BloggerService } from './services/BloggerService';
import { GhostService } from './services/GhostService';
import { SubstackService } from './services/SubstackService';
import { DevToService } from './services/DevToService';
import { DraftManager } from './services/DraftManager';
import { GoogleOAuthService } from './services/GoogleOAuthService';
import MarkdownIt from 'markdown-it';

const WORDPRESS_PASSWORD_KEY = 'liveBlogWriter.wordpress.password';

// Secret keys for different platforms
const getSecretKey = (platform: string, blogName: string, credentialType: string): string => {
    return `liveBlogWriter.${platform}.${blogName}.${credentialType}`;
};

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

interface BlogConfig {
    name: string;
    platform: 'wordpress' | 'blogger' | 'ghost' | 'substack' | 'devto';
    id?: string;
    username?: string;
}

let draftManager: DraftManager;
let googleOAuthService: GoogleOAuthService;

export function activate(context: vscode.ExtensionContext) {
    console.log('Live Blog Writer extension is now active!');
    
    // Initialize draft manager and OAuth service
    draftManager = new DraftManager();
    googleOAuthService = new GoogleOAuthService(context);

    // Check if Blogger OAuth credentials are configured
    checkBloggerCredentials(context);

    // Register command to create a new blog post
    let newPostCommand = vscode.commands.registerCommand('live-blog-writer.newPost', () => {
        BlogEditorPanel.createOrShow(context.extensionUri, draftManager);
    });

    // Register command to set WordPress password
    let setWordPressPasswordCommand = vscode.commands.registerCommand('live-blog-writer.setWordPressPassword', async () => {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogConfigs: BlogConfig[] = config.get('blogs', []);

        // Filter to only WordPress blogs
        const wordpressBlogs = blogConfigs.filter(blog => blog.platform === 'wordpress');

        if (wordpressBlogs.length === 0) {
            vscode.window.showWarningMessage('No WordPress blogs configured. Please add a WordPress blog configuration first.');
            return;
        }

        let selectedBlog: BlogConfig;

        if (wordpressBlogs.length === 1) {
            selectedBlog = wordpressBlogs[0];
        } else {
            // Multiple WordPress blogs - prompt for selection
            const blogNames = wordpressBlogs.map(blog => blog.name);
            const selectedName = await vscode.window.showQuickPick(blogNames, {
                placeHolder: 'Select which WordPress blog to set the password for'
            });

            if (!selectedName) {
                return;
            }

            selectedBlog = wordpressBlogs.find(blog => blog.name === selectedName)!;
        }

        const password = await vscode.window.showInputBox({
            prompt: `Enter WordPress Application Password for "${selectedBlog.name}"`,
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'WordPress application password'
        });

        if (password) {
            const secretKey = getSecretKey('wordpress', selectedBlog.name, 'password');
            await context.secrets.store(secretKey, password);
            vscode.window.showInformationMessage(`WordPress password saved securely for "${selectedBlog.name}".`);
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
        const blogs = config.get<BlogConfig[]>('blogs', []);

        // Check if we have the selected blog from postData
        let selectedBlog: BlogConfig | undefined;
        
        if (postData.selectedBlog) {
            selectedBlog = blogs.find(b => b.name === postData.selectedBlog);
        }

        // If no blog selected or not found, try default blog setting
        if (!selectedBlog) {
            const defaultBlogName = config.get<string>('defaultBlog', '');
            if (defaultBlogName) {
                selectedBlog = blogs.find(b => b.name === defaultBlogName);
                if (!selectedBlog) {
                    vscode.window.showWarningMessage(`Default blog '${defaultBlogName}' not found in configured blogs.`);
                }
            }
        }

        // If still no blog selected, try legacy settings or prompt user
        if (!selectedBlog) {
            if (blogs.length === 0) {
                // Try legacy settings
                const platform = config.get<string>('platform', 'wordpress');
                if (platform === 'wordpress') {
                    const postDataForPublish = await getPostDataForPlatform(postData, 'wordpress');
                    await publishToWordPress(postDataForPublish, config, context);
                    return;
                } else if (platform === 'blogger') {
                    const postDataForPublish = await getPostDataForPlatform(postData, 'blogger');
                    await publishToBlogger(postDataForPublish, config, context);
                    return;
                }
                
                vscode.window.showErrorMessage('No blog configurations found. Please add a blog configuration first.');
                return;
            }

            // Let user select a blog
            const blogOptions = blogs.map(b => `${b.name} (${b.platform})`);
            const selected = await vscode.window.showQuickPick(blogOptions, {
                placeHolder: 'Select blog to publish to'
            });

            if (!selected) {
                return;
            }

            const index = blogOptions.indexOf(selected);
            selectedBlog = blogs[index];
        }

        const postDataForPublish = await getPostDataForPlatform(postData, selectedBlog.platform);

        try {
            switch (selectedBlog.platform) {
                case 'wordpress':
                    await publishToWordPressNew(postDataForPublish, selectedBlog, context);
                    break;
                case 'blogger':
                    await publishToBloggerNew(postDataForPublish, selectedBlog, context);
                    break;
                case 'ghost':
                    await publishToGhost(postDataForPublish, selectedBlog, context);
                    break;
                case 'substack':
                    await publishToSubstack(postDataForPublish, selectedBlog, context);
                    break;
                case 'devto':
                    await publishToDevTo(postDataForPublish, selectedBlog, context);
                    break;
                default:
                    vscode.window.showErrorMessage(`Unsupported platform: ${selectedBlog.platform}`);
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

    // Register command to manage blog configurations (opens webview UI)
    let manageBlogConfigurationsCommand = vscode.commands.registerCommand('live-blog-writer.manageBlogConfigurations', async () => {
        BlogConnectionsPanel.createOrShow(context.extensionUri, context, googleOAuthService);
    });

    // Register command to set Ghost API key
    let setGhostApiKeyCommand = vscode.commands.registerCommand('live-blog-writer.setGhostApiKey', async () => {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);
        const ghostBlogs = blogs.filter(b => b.platform === 'ghost');

        if (ghostBlogs.length === 0) {
            vscode.window.showErrorMessage('No Ghost blog configurations found. Please add a Ghost blog first.');
            return;
        }

        const blogNames = ghostBlogs.map(b => b.name);
        const selectedBlog = await vscode.window.showQuickPick(blogNames, {
            placeHolder: 'Select Ghost blog to set API key for'
        });

        if (!selectedBlog) {
            return;
        }

        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Ghost Admin API key (format: id:secret)',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'API key from Ghost Admin settings'
        });

        if (apiKey) {
            const secretKey = getSecretKey('ghost', selectedBlog, 'apikey');
            await context.secrets.store(secretKey, apiKey);
            vscode.window.showInformationMessage('Ghost API key saved securely.');
        }
    });

    // Register command to set Substack API key
    let setSubstackApiKeyCommand = vscode.commands.registerCommand('live-blog-writer.setSubstackApiKey', async () => {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);
        const substackBlogs = blogs.filter(b => b.platform === 'substack');

        if (substackBlogs.length === 0) {
            vscode.window.showErrorMessage('No Substack blog configurations found. Please add a Substack blog first.');
            return;
        }

        const blogNames = substackBlogs.map(b => b.name);
        const selectedBlog = await vscode.window.showQuickPick(blogNames, {
            placeHolder: 'Select Substack blog to set credentials for'
        });

        if (!selectedBlog) {
            return;
        }

        // Ask user which authentication method they prefer
        const authMethod = await vscode.window.showQuickPick([
            { label: 'Cookie (connect.sid)', value: 'cookie', description: 'Recommended - Most reliable method' },
            { label: 'Email & Password', value: 'email', description: 'Alternative - May not work due to Substack API restrictions' }
        ], {
            placeHolder: 'Select authentication method'
        });

        if (!authMethod) {
            return;
        }

        if (authMethod.value === 'email') {
            // Email/Password authentication
            const email = await vscode.window.showInputBox({
                prompt: 'Enter your Substack email address',
                placeHolder: 'your-email@example.com',
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value) {
                        return 'Email address is required';
                    }
                    // RFC 5322 compliant email validation (simplified)
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        return 'Please enter a valid email address';
                    }
                    return null;
                }
            });

            if (!email) {
                return;
            }

            const password = await vscode.window.showInputBox({
                prompt: 'Enter your Substack password',
                password: true,
                ignoreFocusOut: true,
                placeHolder: 'Your Substack password'
            });

            if (!password) {
                return;
            }

            // Store both email and password
            const emailKey = getSecretKey('substack', selectedBlog, 'email');
            const passwordKey = getSecretKey('substack', selectedBlog, 'password');
            await context.secrets.store(emailKey, email);
            await context.secrets.store(passwordKey, password);
            
            // Clear any existing cookie
            const cookieKey = getSecretKey('substack', selectedBlog, 'apikey');
            await context.secrets.delete(cookieKey);
            
            vscode.window.showInformationMessage(`Substack email/password credentials saved securely for "${selectedBlog}".`);
        } else {
            // Cookie authentication
            const cookie = await vscode.window.showInputBox({
                prompt: 'Enter your Substack connect.sid cookie value',
                password: true,
                ignoreFocusOut: true,
                placeHolder: 'connect.sid cookie from your Substack session'
            });

            if (!cookie) {
                return;
            }

            // Store cookie
            const cookieKey = getSecretKey('substack', selectedBlog, 'apikey');
            await context.secrets.store(cookieKey, cookie);
            
            // Clear any existing email/password
            const emailKey = getSecretKey('substack', selectedBlog, 'email');
            const passwordKey = getSecretKey('substack', selectedBlog, 'password');
            await context.secrets.delete(emailKey);
            await context.secrets.delete(passwordKey);
            
            vscode.window.showInformationMessage(`Substack cookie credential saved securely for "${selectedBlog}".`);
        }
    });

    // Register command to set Dev.to API key
    let setDevToApiKeyCommand = vscode.commands.registerCommand('live-blog-writer.setDevToApiKey', async () => {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);
        const devtoBlogs = blogs.filter(b => b.platform === 'devto');

        if (devtoBlogs.length === 0) {
            vscode.window.showErrorMessage('No Dev.to blog configurations found. Please add a Dev.to account in Blog Connections first.');
            return;
        }

        const blogNames = devtoBlogs.map(b => b.name);
        const selectedBlog = await vscode.window.showQuickPick(blogNames, {
            placeHolder: 'Select Dev.to account to set API key for'
        });

        if (!selectedBlog) {
            return;
        }

        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Dev.to API key',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'DEV API key from Settings → Account → DEV API Keys'
        });

        if (apiKey) {
            const secretKey = getSecretKey('devto', selectedBlog, 'apikey');
            await context.secrets.store(secretKey, apiKey);
            vscode.window.showInformationMessage('Dev.to API key saved securely.');
        }
    });

    // Register command to edit published posts
    let editPublishedPostCommand = vscode.commands.registerCommand('live-blog-writer.editPublishedPost', async () => {
        try {
            const config = vscode.workspace.getConfiguration('liveBlogWriter');
            const blogs = config.get<BlogConfig[]>('blogs', []);

            if (blogs.length === 0) {
                vscode.window.showErrorMessage('No blog configurations found. Please add a blog configuration first.');
                return;
            }

            // Let user select a blog
            const blogOptions = blogs.map(b => `${b.name} (${b.platform})`);
            const selectedBlogOption = await vscode.window.showQuickPick(blogOptions, {
                placeHolder: 'Select blog to edit posts from'
            });

            if (!selectedBlogOption) {
                return;
            }

            const blogIndex = blogOptions.indexOf(selectedBlogOption);
            const selectedBlog = blogs[blogIndex];

            vscode.window.showInformationMessage('Fetching published posts...');

            // Fetch published posts from the selected blog
            let posts: any[] = [];
            try {
                switch (selectedBlog.platform) {
                    case 'wordpress':
                        const wpPassword = await context.secrets.get(getSecretKey('wordpress', selectedBlog.name, 'password'));
                        if (!wpPassword || !selectedBlog.id || !selectedBlog.username) {
                            vscode.window.showErrorMessage('WordPress credentials incomplete. Please configure WordPress first.');
                            return;
                        }
                        const wpService = new WordPressService(selectedBlog.id, selectedBlog.username, wpPassword);
                        posts = await wpService.getPosts(1, 10);
                        break;

                    case 'blogger':
                        const bloggerToken = await context.secrets.get('liveBlogWriter.blogger.token');
                        if (!bloggerToken || !selectedBlog.id) {
                            vscode.window.showErrorMessage('Blogger authentication required. Please authenticate with Blogger first.');
                            return;
                        }
                        const bloggerService = new BloggerService(selectedBlog.id, bloggerToken);
                        posts = await bloggerService.getPosts(10);
                        break;

                    case 'ghost':
                        const ghostApiKey = await context.secrets.get(getSecretKey('ghost', selectedBlog.name, 'apikey'));
                        if (!ghostApiKey || !selectedBlog.id) {
                            vscode.window.showErrorMessage('Ghost API key not configured. Please set Ghost API key first.');
                            return;
                        }
                        const ghostService = new GhostService(selectedBlog.id, ghostApiKey);
                        posts = await ghostService.getPosts(10);
                        break;

                    case 'substack':
                        const substackCookie = await context.secrets.get(getSecretKey('substack', selectedBlog.name, 'apikey'));
                        const substackEmail = await context.secrets.get(getSecretKey('substack', selectedBlog.name, 'email'));
                        const substackPassword = await context.secrets.get(getSecretKey('substack', selectedBlog.name, 'password'));
                        
                        if (!selectedBlog.id) {
                            vscode.window.showErrorMessage('Substack hostname not configured.');
                            return;
                        }
                        
                        let substackAuth: any;
                        if (substackCookie) {
                            substackAuth = { connectSid: substackCookie };
                        } else if (substackEmail && substackPassword) {
                            substackAuth = { email: substackEmail, password: substackPassword };
                        } else {
                            vscode.window.showErrorMessage('Substack credentials not configured. Please set Substack credentials first.');
                            return;
                        }
                        
                        const substackService = new SubstackService(substackAuth, selectedBlog.id);
                        posts = await substackService.getPosts(10);
                        break;

                    case 'devto':
                        const devtoApiKey = await context.secrets.get(getSecretKey('devto', selectedBlog.name, 'apikey'));
                        if (!devtoApiKey) {
                            vscode.window.showErrorMessage('Dev.to API key not configured. Please set Dev.to API key first.');
                            return;
                        }
                        const devtoService = new DevToService(devtoApiKey);
                        posts = await devtoService.getPosts(1, 10);
                        break;

                    default:
                        vscode.window.showErrorMessage(`Platform ${selectedBlog.platform} not supported for editing.`);
                        return;
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to fetch posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
                return;
            }

            if (!posts || posts.length === 0) {
                vscode.window.showInformationMessage('No published posts found on this blog.');
                return;
            }

            // Check for existing edit drafts
            const allDrafts = await draftManager.listDrafts();
            const editDrafts = allDrafts.filter(d => d.isEditDraft && d.blogName === selectedBlog.name);
            
            // Create quick pick items with edit-in-progress indicator
            const quickPickItems = posts.map((post: any) => {
                const postId = post.id;
                const postTitle = post.title?.rendered || post.title || 'Untitled';
                const existingDraft = editDrafts.find(d => String(d.publishedPostId) === String(postId));
                
                return {
                    label: existingDraft ? `$(edit) ${postTitle}` : postTitle,
                    description: existingDraft ? '(Edit in progress)' : '',
                    detail: getPostDetail(post, selectedBlog.platform),
                    post: post,
                    existingDraft: existingDraft
                };
            });

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a post to edit',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (!selected) {
                return;
            }

            // If there's an existing edit draft, load it
            if (selected.existingDraft) {
                const draftContent = await draftManager.loadDraft(selected.existingDraft.id);
                if (draftContent) {
                    BlogEditorPanel.createOrShow(context.extensionUri, draftManager, draftContent);
                    vscode.window.showInformationMessage('Continuing edit of published post.');
                } else {
                    vscode.window.showErrorMessage('Failed to load edit draft.');
                }
                return;
            }

            // Fetch the full post content
            let fullPost: any;
            try {
                switch (selectedBlog.platform) {
                    case 'wordpress':
                        const wpPassword = await context.secrets.get(getSecretKey('wordpress', selectedBlog.name, 'password'));
                        const wpService = new WordPressService(selectedBlog.id!, selectedBlog.username!, wpPassword!);
                        fullPost = await wpService.getPost(selected.post.id);
                        break;

                    case 'blogger':
                        const bloggerToken = await context.secrets.get('liveBlogWriter.blogger.token');
                        const bloggerService = new BloggerService(selectedBlog.id!, bloggerToken!);
                        fullPost = await bloggerService.getPost(selected.post.id);
                        break;

                    case 'ghost':
                        const ghostApiKey = await context.secrets.get(getSecretKey('ghost', selectedBlog.name, 'apikey'));
                        const ghostService = new GhostService(selectedBlog.id!, ghostApiKey!);
                        fullPost = await ghostService.getPost(selected.post.id);
                        break;

                    case 'substack':
                        const substackCookie = await context.secrets.get(getSecretKey('substack', selectedBlog.name, 'apikey'));
                        const substackEmail = await context.secrets.get(getSecretKey('substack', selectedBlog.name, 'email'));
                        const substackPassword = await context.secrets.get(getSecretKey('substack', selectedBlog.name, 'password'));
                        
                        let substackAuth: any;
                        if (substackCookie) {
                            substackAuth = { connectSid: substackCookie };
                        } else {
                            substackAuth = { email: substackEmail, password: substackPassword };
                        }
                        
                        const substackService = new SubstackService(substackAuth, selectedBlog.id!);
                        fullPost = await substackService.getPost(selected.post.id);
                        break;

                    case 'devto':
                        const devtoApiKey = await context.secrets.get(getSecretKey('devto', selectedBlog.name, 'apikey'));
                        const devtoService = new DevToService(devtoApiKey!);
                        fullPost = await devtoService.getPost(selected.post.id);
                        break;
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to fetch post content: ${error instanceof Error ? error.message : 'Unknown error'}`);
                return;
            }

            // Convert post to draft format
            const draftContent = convertPostToDraft(fullPost, selectedBlog.platform, selectedBlog.name);
            
            // Open in editor
            BlogEditorPanel.createOrShow(context.extensionUri, draftManager, draftContent);
            vscode.window.showInformationMessage(`Editing: ${draftContent.title}`);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to edit published post: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        saveDraftCommand,
        manageBlogConfigurationsCommand,
        setGhostApiKeyCommand,
        setSubstackApiKeyCommand,
        setDevToApiKeyCommand,
        editPublishedPostCommand
    );
}

/**
 * Convert publishedPostId to the appropriate type for the platform
 */
function convertPostIdForPlatform(postId: string | number, platform: string): string | number {
    switch (platform) {
        case 'wordpress':
        case 'devto':
            // These platforms use numeric IDs
            return typeof postId === 'number' ? postId : Number(postId);
        case 'blogger':
        case 'ghost':
        case 'substack':
            // These platforms use string IDs
            return String(postId);
        default:
            return postId;
    }
}

/**
 * Get post detail string for display in quick pick
 */
function getPostDetail(post: any, platform: string): string {
    switch (platform) {
        case 'wordpress':
            const wpDate = post.date ? new Date(post.date).toLocaleDateString() : '';
            return `Published: ${wpDate}`;
        
        case 'blogger':
            const bloggerDate = post.published ? new Date(post.published).toLocaleDateString() : '';
            return `Published: ${bloggerDate}`;
        
        case 'ghost':
            const ghostDate = post.published_at ? new Date(post.published_at).toLocaleDateString() : '';
            return `Published: ${ghostDate}`;
        
        case 'substack':
            const substackDate = post.post_date ? new Date(post.post_date).toLocaleDateString() : '';
            return `Published: ${substackDate}`;
        
        case 'devto':
            const devtoDate = post.published_at ? new Date(post.published_at).toLocaleDateString() : '';
            return `Published: ${devtoDate}`;
        
        default:
            return '';
    }
}

/**
 * Convert a post from a platform to draft format
 */
function convertPostToDraft(post: any, platform: string, blogName: string): any {
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
                tags: [], // WordPress tags would need to be fetched separately
                categories: []
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
            // Substack posts are more complex; we'll use basic conversion
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

/**
 * Helper functions for blog configuration management
 * 
 * NOTE: These functions are intentionally kept even though the manageBlogConfigurations
 * command now uses BlogConnectionsPanel (visual webview UI) instead.
 * 
 * Reasons for keeping these functions:
 * 1. Provide programmatic/command-line alternative to the visual UI
 * 2. Can be called from scripts, tests, or other extensions
 * 3. Serve as fallback if webview approach has issues
 * 4. Useful for automated testing and CI/CD scenarios
 * 5. May be exposed as separate commands in the future
 * 
 * While not currently wired to UI commands, they remain valuable utilities.
 */

async function addBlogConfiguration(config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) {
    const blogName = await vscode.window.showInputBox({
        prompt: 'Enter a name for this blog configuration',
        placeHolder: 'e.g., My Personal Blog'
    });

    if (!blogName) {
        return;
    }

    const platform = await vscode.window.showQuickPick(
        ['wordpress', 'blogger', 'ghost', 'substack'],
        { placeHolder: 'Select blog platform' }
    );

    if (!platform) {
        return;
    }

    const blogConfig: BlogConfig = {
        name: blogName,
        platform: platform as any
    };

    // Platform-specific configuration
    switch (platform) {
        case 'wordpress':
            const wpUrl = await vscode.window.showInputBox({
                prompt: 'Enter WordPress site URL',
                placeHolder: 'https://example.com'
            });
            const wpUsername = await vscode.window.showInputBox({
                prompt: 'Enter WordPress username'
            });
            if (wpUrl && wpUsername) {
                blogConfig.id = wpUrl;
                blogConfig.username = wpUsername;
                
                const wpPassword = await vscode.window.showInputBox({
                    prompt: 'Enter WordPress application password',
                    password: true
                });
                if (wpPassword) {
                    const secretKey = getSecretKey('wordpress', blogName, 'password');
                    await context.secrets.store(secretKey, wpPassword);
                }
            }
            break;

        case 'blogger':
            const blogId = await vscode.window.showInputBox({
                prompt: 'Enter Blogger Blog ID'
            });
            if (blogId) {
                blogConfig.id = blogId;
            }
            break;

        case 'ghost':
            const ghostUrl = await vscode.window.showInputBox({
                prompt: 'Enter Ghost site URL',
                placeHolder: 'https://example.com'
            });
            if (ghostUrl) {
                blogConfig.id = ghostUrl;
            }
            vscode.window.showInformationMessage('Remember to set your Ghost API key using the "Set Ghost API Key" command.');
            break;

        case 'substack':
            const substackHostname = await vscode.window.showInputBox({
                prompt: 'Enter Substack hostname',
                placeHolder: 'yoursite.substack.com'
            });
            const substackUsername = await vscode.window.showInputBox({
                prompt: 'Enter Substack username (optional)'
            });
            if (substackHostname) {
                blogConfig.id = substackHostname;
            }
            if (substackUsername) {
                blogConfig.username = substackUsername;
            }
            vscode.window.showInformationMessage('Remember to set your Substack API key using the "Set Substack API Key" command.');
            break;
    }

    // Add to configuration
    const blogs = config.get<BlogConfig[]>('blogs', []);
    blogs.push(blogConfig);
    await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);
    
    vscode.window.showInformationMessage(`Blog configuration "${blogName}" added successfully!`);
}

async function editBlogConfiguration(config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) {
    const blogs = config.get<BlogConfig[]>('blogs', []);
    if (blogs.length === 0) {
        vscode.window.showInformationMessage('No blog configurations found.');
        return;
    }

    const blogNames = blogs.map(b => `${b.name} (${b.platform})`);
    const selected = await vscode.window.showQuickPick(blogNames, {
        placeHolder: 'Select blog to edit'
    });

    if (!selected) {
        return;
    }

    const index = blogNames.indexOf(selected);
    const blog = blogs[index];

    // Show edit options
    const editOptions = ['Change Name', 'Update URL/ID', 'Update Username', 'Update Password/Token'];
    const editChoice = await vscode.window.showQuickPick(editOptions, {
        placeHolder: `Edit ${blog.name}`
    });

    if (!editChoice) {
        return;
    }

    switch (editChoice) {
        case 'Change Name':
            const newName = await vscode.window.showInputBox({
                prompt: 'Enter new name',
                value: blog.name
            });
            if (newName) {
                blog.name = newName;
            }
            break;

        case 'Update URL/ID':
            const newId = await vscode.window.showInputBox({
                prompt: 'Enter new URL/ID',
                value: blog.id
            });
            if (newId) {
                blog.id = newId;
            }
            break;

        case 'Update Username':
            const newUsername = await vscode.window.showInputBox({
                prompt: 'Enter new username',
                value: blog.username
            });
            if (newUsername !== undefined) {
                blog.username = newUsername;
            }
            break;

        case 'Update Password/Token':
            const credential = await vscode.window.showInputBox({
                prompt: `Enter new ${blog.platform} password/token`,
                password: true
            });
            if (credential) {
                const credType = blog.platform === 'wordpress' ? 'password' : 'apikey';
                const secretKey = getSecretKey(blog.platform, blog.name, credType);
                await context.secrets.store(secretKey, credential);
                vscode.window.showInformationMessage('Credential updated successfully.');
                return;
            }
            break;
    }

    blogs[index] = blog;
    await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage('Blog configuration updated successfully!');
}

async function removeBlogConfiguration(config: vscode.WorkspaceConfiguration) {
    const blogs = config.get<BlogConfig[]>('blogs', []);
    if (blogs.length === 0) {
        vscode.window.showInformationMessage('No blog configurations found.');
        return;
    }

    const blogNames = blogs.map(b => `${b.name} (${b.platform})`);
    const selected = await vscode.window.showQuickPick(blogNames, {
        placeHolder: 'Select blog to remove'
    });

    if (!selected) {
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Remove blog configuration "${selected}"?`,
        { modal: true },
        'Remove'
    );

    if (confirm === 'Remove') {
        const index = blogNames.indexOf(selected);
        blogs.splice(index, 1);
        await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Blog configuration removed.');
    }
}

async function migrateLegacySettings(config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) {
    const wpUrl = config.get<string>('wordpress.url');
    const wpUsername = config.get<string>('wordpress.username');
    const bloggerBlogId = config.get<string>('blogger.blogId');
    
    const blogs = config.get<BlogConfig[]>('blogs', []);
    let migrated = false;
    const migratedPlatforms: string[] = [];

    // Migrate WordPress settings if they exist
    if (wpUrl && wpUsername) {
        const existingWp = blogs.find(b => b.platform === 'wordpress' && b.id === wpUrl);
        if (!existingWp) {
            blogs.push({
                name: wpUrl,
                platform: 'wordpress',
                id: wpUrl,
                username: wpUsername
            });
            migrated = true;
            migratedPlatforms.push('WordPress');

            // Try to migrate password
            const wpPassword = await context.secrets.get(WORDPRESS_PASSWORD_KEY);
            if (wpPassword) {
                const secretKey = getSecretKey('wordpress', wpUrl, 'password');
                await context.secrets.store(secretKey, wpPassword);
            }
        }
    }

    // Migrate Blogger settings if they exist
    if (bloggerBlogId) {
        const existingBlogger = blogs.find(b => b.platform === 'blogger' && b.id === bloggerBlogId);
        if (!existingBlogger) {
            blogs.push({
                name: bloggerBlogId,
                platform: 'blogger',
                id: bloggerBlogId
            });
            migrated = true;
            migratedPlatforms.push('Blogger');
        }
    }

    if (migrated) {
        await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);
        const platforms = migratedPlatforms.join(' and ');
        vscode.window.showInformationMessage(`Legacy ${platforms} settings migrated to new blog configuration format!`);
    } else {
        vscode.window.showInformationMessage('No legacy settings found to migrate.');
    }
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

// New publish functions using BlogConfig
async function publishToWordPressNew(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    if (!blogConfig.id || !blogConfig.username) {
        vscode.window.showErrorMessage('WordPress configuration is incomplete. Please update the blog configuration.');
        return;
    }

    const secretKey = getSecretKey('wordpress', blogConfig.name, 'password');
    const password = await context.secrets.get(secretKey);

    if (!password) {
        vscode.window.showErrorMessage('WordPress password not set. Please set it using the blog configuration manager or "Set WordPress Password" command.');
        return;
    }

    const service = new WordPressService(blogConfig.id, blogConfig.username, password);
    
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

    // Check if we're editing an existing post
    if (postData.publishedPostId && postData.isEditDraft) {
        const postId = convertPostIdForPlatform(postData.publishedPostId, 'wordpress');
        const result = await service.updatePost(
            postId as number, 
            postData.title, 
            postData.content, 
            options
        );
        vscode.window.showInformationMessage(`Post updated successfully on ${blogConfig.name}!`);
    } else {
        const result = await service.createPost(postData.title, postData.content, options);
        vscode.window.showInformationMessage(`Post published successfully to ${blogConfig.name}! Post ID: ${result.id}`);
    }
}

async function publishToBloggerNew(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    if (!blogConfig.id) {
        vscode.window.showErrorMessage('Blogger Blog ID is not configured. Please update the blog configuration.');
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

    const service = new BloggerService(blogConfig.id, accessToken);
    
    const options: BloggerPublishOptions = {};

    const status = postData.status || 'draft';
    options.isDraft = (status === 'draft');

    if (postData.publishDate && status === 'publish') {
        try {
            const parsedDate = new Date(postData.publishDate);
            if (!isNaN(parsedDate.getTime())) {
                options.published = parsedDate.toISOString();
            }
        } catch (error) {
            console.error('Invalid publish date format:', postData.publishDate);
        }
    }

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

    // Check if we're editing an existing post
    if (postData.publishedPostId && postData.isEditDraft) {
        const postId = convertPostIdForPlatform(postData.publishedPostId, 'blogger');
        const updateOptions: { labels?: string[]; published?: string } = {};
        
        if (labels.length > 0) {
            updateOptions.labels = labels;
        }
        
        if (options.published) {
            updateOptions.published = options.published;
        }
        
        const result = await service.updatePost(
            postId as string,
            postData.title,
            postData.content,
            updateOptions
        );
        vscode.window.showInformationMessage(`Post updated successfully on ${blogConfig.name}!`);
    } else {
        const result = await service.createPost(postData.title, postData.content, options);
        const statusMessage = options.isDraft ? 'saved as draft' : 'published';
        vscode.window.showInformationMessage(`Post ${statusMessage} successfully to ${blogConfig.name}! Post ID: ${result.id}`);
    }
}

async function publishToGhost(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    if (!blogConfig.id) {
        vscode.window.showErrorMessage('Ghost site URL is not configured. Please update the blog configuration.');
        return;
    }

    const secretKey = getSecretKey('ghost', blogConfig.name, 'apikey');
    const apiKey = await context.secrets.get(secretKey);

    if (!apiKey) {
        vscode.window.showErrorMessage(`Ghost API key not set for "${blogConfig.name}". Please run "Set Ghost API Key" command.`);
        return;
    }

    const service = new GhostService(blogConfig.id, apiKey);

    // Map status
    let status: 'draft' | 'published' | 'scheduled' = 'draft';
    if (postData.status === 'publish') {
        status = postData.publishDate ? 'scheduled' : 'published';
    }

    const options = {
        status: status,
        tags: [...(postData.tags || []), ...(postData.categories || [])],
        excerpt: postData.excerpt,
        publishedAt: postData.publishDate
    };

    // Check if we're editing an existing post
    if (postData.publishedPostId && postData.isEditDraft) {
        const postId = convertPostIdForPlatform(postData.publishedPostId, 'ghost');
        // Need to fetch current post to get updated_at for Ghost
        const currentPost = await service.getPost(postId as string);
        
        if (!currentPost.updated_at) {
            vscode.window.showErrorMessage('Failed to get current post timestamp. Ghost requires this to prevent conflicts.');
            return;
        }
        
        const result = await service.updatePost(
            postId as string,
            postData.title,
            postData.content,
            {
                ...options,
                updatedAt: currentPost.updated_at
            }
        );
        vscode.window.showInformationMessage(`Post updated successfully on ${blogConfig.name}!\nURL: ${result.url}`);
    } else {
        const result = await service.createPost(postData.title, postData.content, options);
        vscode.window.showInformationMessage(
            `Post ${status === 'draft' ? 'saved as draft' : status} successfully to ${blogConfig.name}!\nURL: ${result.url}`
        );
    }
}

async function publishToSubstack(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    if (!blogConfig.id) {
        vscode.window.showErrorMessage('Substack hostname is not configured. Please update the blog configuration.');
        return;
    }

    // Sanitize hostname - remove protocol and trailing slashes
    let hostname = blogConfig.id.trim();
    hostname = hostname.replace(/^https?:\/\//, ''); // Remove http:// or https://
    hostname = hostname.replace(/\/$/, ''); // Remove trailing slash
    
    if (!hostname) {
        vscode.window.showErrorMessage('Invalid Substack hostname. Please update the blog configuration.');
        return;
    }

    // Check for email/password authentication first (preferred method)
    const emailKey = getSecretKey('substack', blogConfig.name, 'email');
    const passwordKey = getSecretKey('substack', blogConfig.name, 'password');
    const cookieKey = getSecretKey('substack', blogConfig.name, 'apikey');

    const email = await context.secrets.get(emailKey);
    const password = await context.secrets.get(passwordKey);
    const cookie = await context.secrets.get(cookieKey);

    let service: SubstackService;

    if (email && password) {
        // Use email/password authentication
        service = new SubstackService({ email, password }, hostname);
    } else if (cookie) {
        // Use cookie authentication
        service = new SubstackService({ connectSid: cookie }, hostname);
    } else {
        vscode.window.showErrorMessage(
            `Substack credentials not set for "${blogConfig.name}". Please run "Set Substack API Key" command.`
        );
        return;
    }

    const isDraft = postData.status !== 'publish';
    const subtitle = postData.excerpt || undefined;

    const options = {
        isDraft: isDraft,
        subtitle: subtitle,
        publishedAt: postData.publishDate
    };

    const result = await service.createPost(postData.title, postData.content, options);
    
    vscode.window.showInformationMessage(
        `Post ${isDraft ? 'saved as draft' : 'published'} successfully to ${blogConfig.name}!\nURL: ${result.url}`
    );
}

async function publishToDevTo(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    const secretKey = getSecretKey('devto', blogConfig.name, 'apikey');
    const apiKey = await context.secrets.get(secretKey);

    if (!apiKey) {
        vscode.window.showErrorMessage(
            `Dev.to API key not set for "${blogConfig.name}". Please use Blog Connections to set it, or run "Live Blog Writer: Set Dev.to API Key".`
        );
        return;
    }

    const service = new DevToService(apiKey);

    const combinedTags: string[] = [...(postData.tags || []), ...(postData.categories || [])]
        .map((t: string) => (t || '').trim())
        .filter((t: string) => t.length > 0)
        .map((t: string) => t.startsWith('#') ? t.slice(1) : t);

    // Dev.to supports up to 4 tags
    const uniqueTags = Array.from(new Set(combinedTags)).slice(0, 4);

    const published = postData.status === 'publish';

    // Check if we're editing an existing post
    if (postData.publishedPostId && postData.isEditDraft) {
        const postId = convertPostIdForPlatform(postData.publishedPostId, 'devto');
        const result = await service.updatePost(postId as number, {
            title: postData.title,
            bodyMarkdown: postData.content || '',
            published,
            tags: uniqueTags.length > 0 ? uniqueTags : undefined,
            description: postData.excerpt
        });

        const url = result?.url || result?.canonical_url;
        vscode.window.showInformationMessage(
            `Post updated successfully on ${blogConfig.name}!${url ? `\nURL: ${url}` : ''}`
        );
    } else {
        const result = await service.createArticle({
            title: postData.title,
            bodyMarkdown: postData.content || '',
            published,
            tags: uniqueTags.length > 0 ? uniqueTags : undefined,
            description: postData.excerpt
        });

        const url = result?.url || result?.canonical_url;
        vscode.window.showInformationMessage(
            `Post ${published ? 'published' : 'saved as draft'} successfully to ${blogConfig.name}!${url ? `\nURL: ${url}` : ''}`
        );
    }
}

async function getPostDataForPlatform(postData: any, platform: BlogConfig['platform'] | string): Promise<any> {
    const postDataForPublish = { ...postData } as any;

    // Dev.to expects Markdown content; do not convert
    if (platform === 'devto') {
        if (postDataForPublish.contentFormat !== 'markdown') {
            throw new Error('Dev.to publishing requires Markdown content. Switch "Content format" to Markdown and try again.');
        }
        return postDataForPublish;
    }

    // HTML-based platforms: if authored in Markdown, convert to HTML before publishing.
    if (postDataForPublish.contentFormat === 'markdown') {
        const md = new MarkdownIt({
            html: true,
            linkify: true,
            breaks: true
        });
        postDataForPublish.content = md.render(postDataForPublish.content || '');
    }

    return postDataForPublish;
}

/**
 * Check if Blogger OAuth credentials are configured and show warning if missing
 */
async function checkBloggerCredentials(context: vscode.ExtensionContext) {
    try {
        // Check if there are any Blogger blogs configured
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogConfigs: BlogConfig[] = config.get('blogs', []);
        const hasBloggerBlogs = blogConfigs.some(blog => blog.platform === 'blogger');

        if (!hasBloggerBlogs) {
            // No Blogger blogs configured, no need to check credentials
            return;
        }

        // Check if user is already authenticated or using custom credentials
        const hasCredentials = await googleOAuthService.isAuthenticated();
        const isUsingCustom = await googleOAuthService.isUsingCustomCredentials();
        
        // Only show warning if not authenticated AND not using custom credentials AND default credentials are missing
        if (!hasCredentials && !isUsingCustom && !googleOAuthService.hasDefaultCredentials()) {
            vscode.window.showWarningMessage(
                'Blogger OAuth credentials are not configured. Blogger blog functionality will not work. ' +
                'Please contact the extension maintainer or configure custom OAuth credentials.',
                'Learn More'
            ).then(selection => {
                if (selection === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://github.com/alvinashcraft/live-blog-writer/blob/main/docs/OAUTH_CREDENTIALS_SETUP.md'));
                }
            });
        }
    } catch (error) {
        // Don't show errors during startup check - just log them
        console.log('Error checking Blogger credentials:', error);
    }
}

export function deactivate() {}
