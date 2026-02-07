import * as vscode from 'vscode';
import { BlogEditorPanel } from './webview/BlogEditorPanel';
import { BlogConnectionsPanel } from './webview/BlogConnectionsPanel';
import { WordPressService } from './services/WordPressService';
import { BloggerService } from './services/BloggerService';
import { GhostService } from './services/GhostService';
import { SubstackService } from './services/SubstackService';
import { DevToService } from './services/DevToService';
import { DraftManager } from './services/DraftManager';
import { TemplateManager } from './services/TemplateManager';
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
let templateManager: TemplateManager;
let googleOAuthService: GoogleOAuthService;

export function activate(context: vscode.ExtensionContext) {
    console.log('Live Blog Writer extension is now active!');
    
    // Initialize draft manager, template manager and OAuth service
    draftManager = new DraftManager();
    templateManager = new TemplateManager();
    googleOAuthService = new GoogleOAuthService(context);

    // Check if Blogger OAuth credentials are configured
    checkBloggerCredentials(context);

    // Register command to create a new blog post
    let newPostCommand = vscode.commands.registerCommand('live-blog-writer.newPost', () => {
        BlogEditorPanel.createOrShow(context.extensionUri, draftManager, undefined, context);
    });

    // Register command to set WordPress password
    let setWordPressPasswordCommand = vscode.commands.registerCommand('live-blog-writer.setWordPressPassword', async () => {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogConfigs: BlogConfig[] = config.get('blogs', []);

        // Filter to only WordPress blogs
        const wordpressBlogs = blogConfigs.filter(blog => blog.platform === 'wordpress');

        if (wordpressBlogs.length === 0) {
            vscode.window.showWarningMessage(vscode.l10n.t('No WordPress blogs configured. Please add a WordPress blog configuration first.'));
            return;
        }

        let selectedBlog: BlogConfig;

        if (wordpressBlogs.length === 1) {
            selectedBlog = wordpressBlogs[0];
        } else {
            // Multiple WordPress blogs - prompt for selection
            const blogNames = wordpressBlogs.map(blog => blog.name);
            const selectedName = await vscode.window.showQuickPick(blogNames, {
                placeHolder: vscode.l10n.t('Select which WordPress blog to set the password for')
            });

            if (!selectedName) {
                return;
            }

            selectedBlog = wordpressBlogs.find(blog => blog.name === selectedName)!;
        }

        const password = await vscode.window.showInputBox({
            prompt: vscode.l10n.t('Enter WordPress Application Password for "{0}"', selectedBlog.name),
            password: true,
            ignoreFocusOut: true,
            placeHolder: vscode.l10n.t('WordPress application password')
        });

        if (password) {
            const secretKey = getSecretKey('wordpress', selectedBlog.name, 'password');
            await context.secrets.store(secretKey, password);
            vscode.window.showInformationMessage(vscode.l10n.t('WordPress password saved securely for "{0}".', selectedBlog.name));
        }
    });

    // Register command to set custom Blogger OAuth credentials (optional - for advanced users)
    let setBloggerClientIdCommand = vscode.commands.registerCommand('live-blog-writer.setBloggerClientId', async () => {
        const isUsingCustom = await googleOAuthService.isUsingCustomCredentials();
        
        if (isUsingCustom) {
            const action = await vscode.window.showWarningMessage(
                vscode.l10n.t('You are currently using custom OAuth credentials. What would you like to do?'),
                vscode.l10n.t('Update Credentials'),
                vscode.l10n.t('Revert to Default'),
                vscode.l10n.t('Cancel')
            );

            if (action === vscode.l10n.t('Revert to Default')) {
                await googleOAuthService.clearCustomClientCredentials();
                await googleOAuthService.clearAuthentication();
                vscode.window.showInformationMessage(vscode.l10n.t('Reverted to default OAuth credentials. Please re-authenticate.'));
                return;
            } else if (action !== vscode.l10n.t('Update Credentials')) {
                return;
            }
        } else {
            const proceed = await vscode.window.showInformationMessage(
                vscode.l10n.t('This extension comes with built-in OAuth credentials. You only need custom credentials if you want to use your own Google Cloud project.\n\nDo you want to set up custom credentials?'),
                vscode.l10n.t('Yes'),
                vscode.l10n.t('No')
            );

            if (proceed !== vscode.l10n.t('Yes')) {
                return;
            }
        }

        const clientId = await vscode.window.showInputBox({
            prompt: vscode.l10n.t('Enter your Google OAuth Client ID'),
            placeHolder: 'your-client-id.apps.googleusercontent.com',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return vscode.l10n.t('Client ID cannot be empty');
                }
                return null;
            }
        });

        if (!clientId) {
            return;
        }

        const clientSecret = await vscode.window.showInputBox({
            prompt: vscode.l10n.t('Enter your Google OAuth Client Secret'),
            placeHolder: 'GOCSPX-...',
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return vscode.l10n.t('Client Secret cannot be empty');
                }
                return null;
            }
        });

        if (!clientSecret) {
            return;
        }

        await googleOAuthService.setCustomClientCredentials(clientId, clientSecret);
        await googleOAuthService.clearAuthentication();
        vscode.window.showInformationMessage(vscode.l10n.t('Custom OAuth credentials saved. Please re-authenticate with your credentials.'));
    });

    // Register command to authenticate with Google for Blogger
    let authenticateBloggerCommand = vscode.commands.registerCommand('live-blog-writer.authenticateBlogger', async () => {
        try {
            await googleOAuthService.authenticate();
            vscode.window.showInformationMessage(vscode.l10n.t('Successfully authenticated with Google for Blogger!'));
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to authenticate: {0}', error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    // Register command to publish the current post
    let publishPostCommand = vscode.commands.registerCommand('live-blog-writer.publishPost', async () => {
        const panel = BlogEditorPanel.currentPanel;
        if (!panel) {
            vscode.window.showErrorMessage(vscode.l10n.t('No blog post is currently open. Please create a new post first.'));
            return;
        }

        // Get the post content from the webview
        const postData = await panel.getPostData();
        if (!postData) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to retrieve post data.'));
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
                    vscode.window.showWarningMessage(vscode.l10n.t('Default blog \'{0}\' not found in configured blogs.', defaultBlogName));
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
                
                vscode.window.showErrorMessage(vscode.l10n.t('No blog configurations found. Please add a blog configuration first.'));
                return;
            }

            // Let user select a blog
            const blogOptions = blogs.map(b => `${b.name} (${b.platform})`);
            const selected = await vscode.window.showQuickPick(blogOptions, {
                placeHolder: vscode.l10n.t('Select blog to publish to')
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
                    vscode.window.showErrorMessage(vscode.l10n.t('Unsupported platform: {0}', selectedBlog.platform));
            }
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to publish post: {0}', error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    // Register command to open recent drafts
    let openRecentDraftCommand = vscode.commands.registerCommand('live-blog-writer.openRecentDraft', async () => {
        try {
            const recentDrafts = await draftManager.getRecentDrafts(20);
            
            if (recentDrafts.length === 0) {
                vscode.window.showInformationMessage(vscode.l10n.t('No recent drafts found.'));
                return;
            }

            // Create quick pick items with draft info
            const quickPickItems = recentDrafts.map(draft => ({
                label: draft.title || vscode.l10n.t('Untitled Draft'),
                description: vscode.l10n.t('{0} words', draft.wordCount),
                detail: `Last modified: ${draft.updatedAt.toLocaleDateString()} ${draft.updatedAt.toLocaleTimeString()}`,
                draft: draft
            }));

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: vscode.l10n.t('Select a draft to open'),
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                const draftContent = await draftManager.loadDraft(selected.draft.id);
                if (draftContent) {
                    BlogEditorPanel.createOrShow(context.extensionUri, draftManager, draftContent, context);
                } else {
                    vscode.window.showErrorMessage(vscode.l10n.t('Failed to load the selected draft.'));
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to load recent drafts: {0}', error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    // Register command to manage drafts
    let manageDraftsCommand = vscode.commands.registerCommand('live-blog-writer.manageDrafts', async () => {
        try {
            const allDrafts = await draftManager.listDrafts();
            
            if (allDrafts.length === 0) {
                const action = await vscode.window.showInformationMessage(vscode.l10n.t('No drafts found.'), vscode.l10n.t('Create New Post'));
                if (action === vscode.l10n.t('Create New Post')) {
                    vscode.commands.executeCommand('live-blog-writer.newPost');
                }
                return;
            }

            // Create quick pick items with management options
            const quickPickItems = [
                { label: vscode.l10n.t('$(folder-opened) Open Drafts Folder'), description: vscode.l10n.t('Open the drafts folder in file explorer'), action: 'openFolder' },
                { label: vscode.l10n.t('$(trash) Cleanup Old Drafts'), description: vscode.l10n.t('Delete drafts older than 30 days'), action: 'cleanup' },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                ...allDrafts.map(draft => ({
                    label: draft.title || vscode.l10n.t('Untitled Draft'),
                    description: vscode.l10n.t('{0} words', draft.wordCount),
                    detail: `Last modified: ${draft.updatedAt.toLocaleDateString()} ${draft.updatedAt.toLocaleTimeString()}`,
                    action: 'open',
                    draft: draft
                }))
            ];

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: vscode.l10n.t('Select an action or draft to open'),
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
                            vscode.l10n.t('Delete all drafts older than 30 days?'),
                            { modal: true },
                            vscode.l10n.t('Delete')
                        );
                        if (confirm === vscode.l10n.t('Delete')) {
                            const deletedCount = await draftManager.cleanupOldDrafts(30);
                            vscode.window.showInformationMessage(vscode.l10n.t('Deleted {0} old drafts.', deletedCount));
                        }
                        break;
                    
                    case 'open':
                        if ('draft' in selected && selected.draft) {
                            const draftContent = await draftManager.loadDraft((selected as any).draft.id);
                            if (draftContent) {
                                BlogEditorPanel.createOrShow(context.extensionUri, draftManager, draftContent, context);
                            } else {
                                vscode.window.showErrorMessage(vscode.l10n.t('Failed to load the selected draft.'));
                            }
                        }
                        break;
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to manage drafts: {0}', error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    // Register command to save current draft
    let saveDraftCommand = vscode.commands.registerCommand('live-blog-writer.saveDraft', async () => {
        const panel = BlogEditorPanel.currentPanel;
        if (!panel) {
            vscode.window.showErrorMessage(vscode.l10n.t('No blog post is currently open.'));
            return;
        }

        try {
            await panel.saveDraftManually();
            vscode.window.showInformationMessage(vscode.l10n.t('Draft saved successfully.'));
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to save draft: {0}', error instanceof Error ? error.message : 'Unknown error'));
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
            vscode.window.showErrorMessage(vscode.l10n.t('No Ghost blog configurations found. Please add a Ghost blog first.'));
            return;
        }

        const blogNames = ghostBlogs.map(b => b.name);
        const selectedBlog = await vscode.window.showQuickPick(blogNames, {
            placeHolder: vscode.l10n.t('Select Ghost blog to set API key for')
        });

        if (!selectedBlog) {
            return;
        }

        const apiKey = await vscode.window.showInputBox({
            prompt: vscode.l10n.t('Enter your Ghost Admin API key (format: id:secret)'),
            password: true,
            ignoreFocusOut: true,
            placeHolder: vscode.l10n.t('API key from Ghost Admin settings')
        });

        if (apiKey) {
            const secretKey = getSecretKey('ghost', selectedBlog, 'apikey');
            await context.secrets.store(secretKey, apiKey);
            vscode.window.showInformationMessage(vscode.l10n.t('Ghost API key saved securely.'));
        }
    });

    // Register command to set Substack API key
    let setSubstackApiKeyCommand = vscode.commands.registerCommand('live-blog-writer.setSubstackApiKey', async () => {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);
        const substackBlogs = blogs.filter(b => b.platform === 'substack');

        if (substackBlogs.length === 0) {
            vscode.window.showErrorMessage(vscode.l10n.t('No Substack blog configurations found. Please add a Substack blog first.'));
            return;
        }

        const blogNames = substackBlogs.map(b => b.name);
        const selectedBlog = await vscode.window.showQuickPick(blogNames, {
            placeHolder: vscode.l10n.t('Select Substack blog to set credentials for')
        });

        if (!selectedBlog) {
            return;
        }

        // Ask user which authentication method they prefer
        const authMethod = await vscode.window.showQuickPick([
            { label: vscode.l10n.t('Cookie (connect.sid)'), value: 'cookie', description: vscode.l10n.t('Recommended - Most reliable method') },
            { label: vscode.l10n.t('Email & Password'), value: 'email', description: vscode.l10n.t('Alternative - May not work due to Substack API restrictions') }
        ], {
            placeHolder: vscode.l10n.t('Select authentication method')
        });

        if (!authMethod) {
            return;
        }

        if (authMethod.value === 'email') {
            // Email/Password authentication
            const email = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter your Substack email address'),
                placeHolder: 'your-email@example.com',
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value) {
                        return vscode.l10n.t('Email address is required');
                    }
                    // RFC 5322 compliant email validation (simplified)
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        return vscode.l10n.t('Please enter a valid email address');
                    }
                    return null;
                }
            });

            if (!email) {
                return;
            }

            const password = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter your Substack password'),
                password: true,
                ignoreFocusOut: true,
                placeHolder: vscode.l10n.t('Your Substack password')
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
            
            vscode.window.showInformationMessage(vscode.l10n.t('Substack email/password credentials saved securely for "{0}".', selectedBlog));
        } else {
            // Cookie authentication
            const cookie = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter your Substack connect.sid cookie value'),
                password: true,
                ignoreFocusOut: true,
                placeHolder: vscode.l10n.t('connect.sid cookie from your Substack session')
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
            
            vscode.window.showInformationMessage(vscode.l10n.t('Substack cookie credential saved securely for "{0}".', selectedBlog));
        }
    });

    // Register command to set Dev.to API key
    let setDevToApiKeyCommand = vscode.commands.registerCommand('live-blog-writer.setDevToApiKey', async () => {
        const config = vscode.workspace.getConfiguration('liveBlogWriter');
        const blogs = config.get<BlogConfig[]>('blogs', []);
        const devtoBlogs = blogs.filter(b => b.platform === 'devto');

        if (devtoBlogs.length === 0) {
            vscode.window.showErrorMessage(vscode.l10n.t('No Dev.to blog configurations found. Please add a Dev.to account in Blog Connections first.'));
            return;
        }

        const blogNames = devtoBlogs.map(b => b.name);
        const selectedBlog = await vscode.window.showQuickPick(blogNames, {
            placeHolder: vscode.l10n.t('Select Dev.to account to set API key for')
        });

        if (!selectedBlog) {
            return;
        }

        const apiKey = await vscode.window.showInputBox({
            prompt: vscode.l10n.t('Enter your Dev.to API key'),
            password: true,
            ignoreFocusOut: true,
            placeHolder: vscode.l10n.t('DEV API key from Settings → Account → DEV API Keys')
        });

        if (apiKey) {
            const secretKey = getSecretKey('devto', selectedBlog, 'apikey');
            await context.secrets.store(secretKey, apiKey);
            vscode.window.showInformationMessage(vscode.l10n.t('Dev.to API key saved securely.'));
        }
    });

    // Register command to edit published posts
    let editPublishedPostCommand = vscode.commands.registerCommand('live-blog-writer.editPublishedPost', async () => {
        try {
            const config = vscode.workspace.getConfiguration('liveBlogWriter');
            const blogs = config.get<BlogConfig[]>('blogs', []);

            if (blogs.length === 0) {
                vscode.window.showErrorMessage(vscode.l10n.t('No blog configurations found. Please add a blog configuration first.'));
                return;
            }

            // Open the editor with the post selector modal
            BlogEditorPanel.createOrShow(context.extensionUri, draftManager, undefined, context, true);
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to edit published post: {0}', error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    // Register command to save current post as a template
    let saveAsTemplateCommand = vscode.commands.registerCommand('live-blog-writer.saveAsTemplate', async () => {
        const panel = BlogEditorPanel.currentPanel;
        if (!panel) {
            vscode.window.showErrorMessage(vscode.l10n.t('No blog post is currently open.'));
            return;
        }

        try {
            const postData = await panel.getPostData();
            if (!postData) {
                vscode.window.showErrorMessage(vscode.l10n.t('Failed to retrieve post data.'));
                return;
            }

            const templateName = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter a name for this template'),
                placeHolder: vscode.l10n.t('e.g., Weekly Newsletter'),
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return vscode.l10n.t('Template name cannot be empty');
                    }
                    return null;
                }
            });

            if (!templateName) {
                return;
            }

            await templateManager.saveTemplate(templateName.trim(), {
                title: postData.title,
                content: postData.content,
                contentFormat: postData.contentFormat,
                tags: postData.tags,
                categories: postData.categories,
                excerpt: postData.excerpt
            });

            vscode.window.showInformationMessage(vscode.l10n.t('Template "{0}" saved successfully.', templateName.trim()));
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to save template: {0}', error instanceof Error ? error.message : 'Unknown error'));
        }
    });

    // Register command to create a new post from a template
    let newPostFromTemplateCommand = vscode.commands.registerCommand('live-blog-writer.newPostFromTemplate', async () => {
        try {
            const templates = await templateManager.listTemplates();

            if (templates.length === 0) {
                vscode.window.showInformationMessage(vscode.l10n.t('No templates found. Use "Save as Template" to create one.'));
                return;
            }

            const quickPickItems = templates.map(tmpl => ({
                label: tmpl.name,
                description: tmpl.contentFormat || 'html',
                detail: vscode.l10n.t('Created: {0}', tmpl.createdAt.toLocaleDateString()),
                template: tmpl
            }));

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: vscode.l10n.t('Select a template'),
                matchOnDescription: true
            });

            if (!selected) {
                return;
            }

            const templateContent = await templateManager.loadTemplate(selected.template.id);
            if (!templateContent) {
                vscode.window.showErrorMessage(vscode.l10n.t('Failed to load the selected template.'));
                return;
            }

            // Convert template to draft content format for the editor
            const draftFromTemplate = {
                title: templateContent.title,
                content: templateContent.content,
                contentFormat: templateContent.contentFormat,
                tags: templateContent.tags,
                categories: templateContent.categories,
                excerpt: templateContent.excerpt,
                metadata: {
                    id: '',
                    title: templateContent.title,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    wordCount: 0
                }
            };

            BlogEditorPanel.createOrShow(context.extensionUri, draftManager, draftFromTemplate, context);
        } catch (error) {
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to create post from template: {0}', error instanceof Error ? error.message : 'Unknown error'));
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
        editPublishedPostCommand,
        saveAsTemplateCommand,
        newPostFromTemplateCommand
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
        prompt: vscode.l10n.t('Enter a name for this blog configuration'),
        placeHolder: vscode.l10n.t('e.g., My Personal Blog')
    });

    if (!blogName) {
        return;
    }

    const platform = await vscode.window.showQuickPick(
        ['wordpress', 'blogger', 'ghost', 'substack'],
        { placeHolder: vscode.l10n.t('Select blog platform') }
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
                prompt: vscode.l10n.t('Enter WordPress site URL'),
                placeHolder: 'https://example.com'
            });
            const wpUsername = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter WordPress username')
            });
            if (wpUrl && wpUsername) {
                blogConfig.id = wpUrl;
                blogConfig.username = wpUsername;
                
                const wpPassword = await vscode.window.showInputBox({
                    prompt: vscode.l10n.t('Enter WordPress application password'),
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
                prompt: vscode.l10n.t('Enter Blogger Blog ID')
            });
            if (blogId) {
                blogConfig.id = blogId;
            }
            break;

        case 'ghost':
            const ghostUrl = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter Ghost site URL'),
                placeHolder: 'https://example.com'
            });
            if (ghostUrl) {
                blogConfig.id = ghostUrl;
            }
            vscode.window.showInformationMessage(vscode.l10n.t('Remember to set your Ghost API key using the "Set Ghost API Key" command.'));
            break;

        case 'substack':
            const substackHostname = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter Substack hostname'),
                placeHolder: 'yoursite.substack.com'
            });
            const substackUsername = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter Substack username (optional)')
            });
            if (substackHostname) {
                blogConfig.id = substackHostname;
            }
            if (substackUsername) {
                blogConfig.username = substackUsername;
            }
            vscode.window.showInformationMessage(vscode.l10n.t('Remember to set your Substack API key using the "Set Substack API Key" command.'));
            break;
    }

    // Add to configuration
    const blogs = config.get<BlogConfig[]>('blogs', []);
    blogs.push(blogConfig);
    await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);
    
    vscode.window.showInformationMessage(vscode.l10n.t('Blog configuration "{0}" added successfully!', blogName));
}

async function editBlogConfiguration(config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) {
    const blogs = config.get<BlogConfig[]>('blogs', []);
    if (blogs.length === 0) {
        vscode.window.showInformationMessage(vscode.l10n.t('No blog configurations found.'));
        return;
    }

    const blogNames = blogs.map(b => `${b.name} (${b.platform})`);
    const selected = await vscode.window.showQuickPick(blogNames, {
        placeHolder: vscode.l10n.t('Select blog to edit')
    });

    if (!selected) {
        return;
    }

    const index = blogNames.indexOf(selected);
    const blog = blogs[index];

    // Show edit options
    const editOptions = [
        vscode.l10n.t('Change Name'),
        vscode.l10n.t('Update URL/ID'),
        vscode.l10n.t('Update Username'),
        vscode.l10n.t('Update Password/Token')
    ];
    const editChoice = await vscode.window.showQuickPick(editOptions, {
        placeHolder: vscode.l10n.t('Edit {0}', blog.name)
    });

    if (!editChoice) {
        return;
    }

    switch (editChoice) {
        case vscode.l10n.t('Change Name'):
            const newName = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter new name'),
                value: blog.name
            });
            if (newName) {
                blog.name = newName;
            }
            break;

        case vscode.l10n.t('Update URL/ID'):
            const newId = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter new URL/ID'),
                value: blog.id
            });
            if (newId) {
                blog.id = newId;
            }
            break;

        case vscode.l10n.t('Update Username'):
            const newUsername = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter new username'),
                value: blog.username
            });
            if (newUsername !== undefined) {
                blog.username = newUsername;
            }
            break;

        case vscode.l10n.t('Update Password/Token'):
            const credential = await vscode.window.showInputBox({
                prompt: vscode.l10n.t('Enter new {0} password/token', blog.platform),
                password: true
            });
            if (credential) {
                const credType = blog.platform === 'wordpress' ? 'password' : 'apikey';
                const secretKey = getSecretKey(blog.platform, blog.name, credType);
                await context.secrets.store(secretKey, credential);
                vscode.window.showInformationMessage(vscode.l10n.t('Credential updated successfully.'));
                return;
            }
            break;
    }

    blogs[index] = blog;
    await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(vscode.l10n.t('Blog configuration updated successfully!'));
}

async function removeBlogConfiguration(config: vscode.WorkspaceConfiguration) {
    const blogs = config.get<BlogConfig[]>('blogs', []);
    if (blogs.length === 0) {
        vscode.window.showInformationMessage(vscode.l10n.t('No blog configurations found.'));
        return;
    }

    const blogNames = blogs.map(b => `${b.name} (${b.platform})`);
    const selected = await vscode.window.showQuickPick(blogNames, {
        placeHolder: vscode.l10n.t('Select blog to remove')
    });

    if (!selected) {
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        vscode.l10n.t('Remove blog configuration "{0}"?', selected),
        { modal: true },
        vscode.l10n.t('Remove')
    );

    if (confirm === vscode.l10n.t('Remove')) {
        const index = blogNames.indexOf(selected);
        blogs.splice(index, 1);
        await config.update('blogs', blogs, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(vscode.l10n.t('Blog configuration removed.'));
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
        vscode.window.showInformationMessage(vscode.l10n.t('Legacy {0} settings migrated to new blog configuration format!', platforms));
    } else {
        vscode.window.showInformationMessage(vscode.l10n.t('No legacy settings found to migrate.'));
    }
}

async function publishToWordPress(postData: any, config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) {
    const url = config.get<string>('wordpress.url');
    const username = config.get<string>('wordpress.username');
    const password = await context.secrets.get(WORDPRESS_PASSWORD_KEY);

    if (!url || !username) {
        vscode.window.showErrorMessage(vscode.l10n.t('WordPress configuration is incomplete. Please configure your WordPress URL and username in settings.'));
        return;
    }

    if (!password) {
        vscode.window.showErrorMessage(vscode.l10n.t('WordPress password not set. Please run "Live Blog Writer: Set WordPress Password" command first.'));
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
    
    vscode.window.showInformationMessage(vscode.l10n.t('Post published successfully to WordPress! Post ID: {0}', result.id));
}

async function publishToBlogger(postData: any, config: vscode.WorkspaceConfiguration, context: vscode.ExtensionContext) {
    const blogId = config.get<string>('blogger.blogId');

    if (!blogId) {
        vscode.window.showErrorMessage(vscode.l10n.t('Blogger Blog ID is not configured. Please configure it in settings.'));
        return;
    }

    // Get Google OAuth token for Blogger API
    let accessToken;
    try {
        accessToken = await googleOAuthService.authenticate();
    } catch (error) {
        vscode.window.showErrorMessage(
            vscode.l10n.t('Failed to authenticate with Google: {0}. Please run the "Live Blog Writer: Authenticate with Blogger" command to sign in.', error instanceof Error ? error.message : 'Unknown error')
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
    
    const statusMessage = options.isDraft ? vscode.l10n.t('saved as draft') : vscode.l10n.t('published');
    vscode.window.showInformationMessage(vscode.l10n.t('Post {0} successfully to Blogger! Post ID: {1}', statusMessage, result.id));
}

// New publish functions using BlogConfig
async function publishToWordPressNew(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    if (!blogConfig.id || !blogConfig.username) {
        vscode.window.showErrorMessage(vscode.l10n.t('WordPress configuration is incomplete. Please update the blog configuration.'));
        return;
    }

    const secretKey = getSecretKey('wordpress', blogConfig.name, 'password');
    const password = await context.secrets.get(secretKey);

    if (!password) {
        vscode.window.showErrorMessage(vscode.l10n.t('WordPress password not set. Please set it using the blog configuration manager or "Set WordPress Password" command.'));
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
        const postUrl = result.link || postData.postUrl;
        if (postUrl) {
            const action = await vscode.window.showInformationMessage(
                vscode.l10n.t('Post updated successfully on {0}!', blogConfig.name),
                vscode.l10n.t('View Post')
            );
            if (action === vscode.l10n.t('View Post')) {
                vscode.env.openExternal(vscode.Uri.parse(postUrl));
            }
        } else {
            vscode.window.showInformationMessage(vscode.l10n.t('Post updated successfully on {0}!', blogConfig.name));
        }
    } else {
        const result = await service.createPost(postData.title, postData.content, options);
        vscode.window.showInformationMessage(vscode.l10n.t('Post published successfully to {0}! Post ID: {1}', blogConfig.name, result.id));
    }
}

async function publishToBloggerNew(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    if (!blogConfig.id) {
        vscode.window.showErrorMessage(vscode.l10n.t('Blogger Blog ID is not configured. Please update the blog configuration.'));
        return;
    }

    // Get Google OAuth token for Blogger API
    let accessToken;
    try {
        accessToken = await googleOAuthService.authenticate();
    } catch (error) {
        vscode.window.showErrorMessage(
            vscode.l10n.t('Failed to authenticate with Google: {0}. Please run the "Live Blog Writer: Authenticate with Blogger" command to sign in.', error instanceof Error ? error.message : 'Unknown error')
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
        
        await service.updatePost(
            postId as string,
            postData.title,
            postData.content,
            updateOptions
        );
        const postUrl = postData.postUrl;
        if (postUrl) {
            const action = await vscode.window.showInformationMessage(
                vscode.l10n.t('Post updated successfully on {0}!', blogConfig.name),
                vscode.l10n.t('View Post')
            );
            if (action === vscode.l10n.t('View Post')) {
                vscode.env.openExternal(vscode.Uri.parse(postUrl));
            }
        } else {
            vscode.window.showInformationMessage(vscode.l10n.t('Post updated successfully on {0}!', blogConfig.name));
        }
    } else {
        const result = await service.createPost(postData.title, postData.content, options);
        const statusMessage = options.isDraft ? vscode.l10n.t('saved as draft') : vscode.l10n.t('published');
        vscode.window.showInformationMessage(vscode.l10n.t('Post {0} successfully to {1}! Post ID: {2}', statusMessage, blogConfig.name, result.id));
    }
}

async function publishToGhost(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    if (!blogConfig.id) {
        vscode.window.showErrorMessage(vscode.l10n.t('Ghost site URL is not configured. Please update the blog configuration.'));
        return;
    }

    const secretKey = getSecretKey('ghost', blogConfig.name, 'apikey');
    const apiKey = await context.secrets.get(secretKey);

    if (!apiKey) {
        vscode.window.showErrorMessage(vscode.l10n.t('Ghost API key not set for "{0}". Please run "Set Ghost API Key" command.', blogConfig.name));
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
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to get current post timestamp. Ghost requires this to prevent conflicts.'));
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
        vscode.window.showInformationMessage(vscode.l10n.t('Post updated successfully on {0}!\nURL: {1}', blogConfig.name, result.url));
    } else {
        const result = await service.createPost(postData.title, postData.content, options);
        const ghostStatusMessage = status === 'draft' ? vscode.l10n.t('saved as draft') : status;
        vscode.window.showInformationMessage(
            vscode.l10n.t('Post {0} successfully to {1}!\nURL: {2}', ghostStatusMessage, blogConfig.name, result.url)
        );
    }
}

async function publishToSubstack(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    if (!blogConfig.id) {
        vscode.window.showErrorMessage(vscode.l10n.t('Substack hostname is not configured. Please update the blog configuration.'));
        return;
    }

    // Sanitize hostname - remove protocol and trailing slashes
    let hostname = blogConfig.id.trim();
    hostname = hostname.replace(/^https?:\/\//, ''); // Remove http:// or https://
    hostname = hostname.replace(/\/$/, ''); // Remove trailing slash
    
    if (!hostname) {
        vscode.window.showErrorMessage(vscode.l10n.t('Invalid Substack hostname. Please update the blog configuration.'));
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
            vscode.l10n.t('Substack credentials not set for "{0}". Please run "Set Substack API Key" command.', blogConfig.name)
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
    
    const substackStatusMessage = isDraft ? vscode.l10n.t('saved as draft') : vscode.l10n.t('published');
    vscode.window.showInformationMessage(
        vscode.l10n.t('Post {0} successfully to {1}!\nURL: {2}', substackStatusMessage, blogConfig.name, result.url)
    );
}

async function publishToDevTo(postData: any, blogConfig: BlogConfig, context: vscode.ExtensionContext) {
    const secretKey = getSecretKey('devto', blogConfig.name, 'apikey');
    const apiKey = await context.secrets.get(secretKey);

    if (!apiKey) {
        vscode.window.showErrorMessage(
            vscode.l10n.t('Dev.to API key not set for "{0}". Please use Blog Connections to set it, or run "Live Blog Writer: Set Dev.to API Key".', blogConfig.name)
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
            url ? vscode.l10n.t('Post updated successfully on {0}!\nURL: {1}', blogConfig.name, url) : vscode.l10n.t('Post updated successfully on {0}!', blogConfig.name)
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
        const devtoStatusMessage = published ? vscode.l10n.t('published') : vscode.l10n.t('saved as draft');
        vscode.window.showInformationMessage(
            url ? vscode.l10n.t('Post {0} successfully to {1}!\nURL: {2}', devtoStatusMessage, blogConfig.name, url) : vscode.l10n.t('Post {0} successfully to {1}!', devtoStatusMessage, blogConfig.name)
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
                vscode.l10n.t('Blogger OAuth credentials are not configured. Blogger blog functionality will not work. Please contact the extension maintainer or configure custom OAuth credentials.'),
                vscode.l10n.t('Learn More')
            ).then(selection => {
                if (selection === vscode.l10n.t('Learn More')) {
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
