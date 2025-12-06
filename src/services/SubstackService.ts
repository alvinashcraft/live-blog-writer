import axios, { AxiosInstance } from 'axios';

/**
 * SubstackService for publishing posts to Substack
 * 
 * This implementation supports both authentication methods:
 * 1. Email/Password authentication (recommended, more stable)
 * 2. Cookie-based authentication (connect.sid cookie from browser)
 * 
 * Email/password auth is preferred as it mirrors the python-substack library
 * and provides more reliable authentication.
 */
export class SubstackService {
    private api: AxiosInstance;
    private baseAPI: AxiosInstance;
    private hostname: string;
    private email?: string;
    private password?: string;
    private connectSid?: string;
    private userId?: number;
    private publicationUrl?: string;

    /**
     * Create a SubstackService instance
     * @param auth Authentication credentials (either email/password or connect.sid cookie)
     * @param hostname Substack publication hostname (e.g., 'yourname.substack.com')
     */
    constructor(
        auth: { email: string; password: string } | { connectSid: string },
        hostname: string
    ) {
        this.hostname = hostname;
        
        if ('email' in auth) {
            this.email = auth.email;
            this.password = auth.password;
        } else {
            this.connectSid = auth.connectSid;
        }

        // Base API for login and global endpoints
        this.baseAPI = axios.create({
            baseURL: 'https://substack.com/api/v1',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });

        // Publication-specific API
        this.api = axios.create({
            baseURL: `https://${hostname}/api/v1`,
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });

        // If using cookie auth, set it immediately
        if (this.connectSid) {
            this.api.defaults.headers.common['Cookie'] = `connect.sid=${this.connectSid}`;
            this.baseAPI.defaults.headers.common['Cookie'] = `connect.sid=${this.connectSid}`;
        }
    }

    /**
     * Authenticate with Substack using email/password
     * This must be called before other operations if using email/password auth
     */
    private async login(): Promise<void> {
        if (!this.email || !this.password) {
            return; // Already using cookie auth
        }

        try {
            const response = await this.baseAPI.post('/login', {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                captcha_response: null,
                email: this.email,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                for_pub: '',
                password: this.password,
                redirect: '/'
            });

            // Extract cookies from response
            const cookies = response.headers['set-cookie'];
            if (cookies) {
                const sidCookie = cookies.find(c => c.startsWith('connect.sid='));
                if (sidCookie) {
                    this.connectSid = sidCookie.split(';')[0].split('=')[1];
                    this.api.defaults.headers.common['Cookie'] = `connect.sid=${this.connectSid}`;
                    this.baseAPI.defaults.headers.common['Cookie'] = `connect.sid=${this.connectSid}`;
                }
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to login to Substack: ${error.response?.data?.message || error.message}`);
            }
            throw new Error(`Failed to login to Substack: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get user ID - required for creating posts
     */
    private async getUserId(): Promise<number> {
        if (this.userId !== undefined) {
            return this.userId;
        }

        try {
            const response = await this.baseAPI.get('/user/profile/self');
            this.userId = response.data.id;
            
            if (this.userId === undefined) {
                throw new Error('Failed to retrieve user ID from profile');
            }
            
            return this.userId;
        } catch (error) {
            throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Ensure authentication is complete
     */
    private async ensureAuthenticated(): Promise<void> {
        if (this.email && this.password && !this.connectSid) {
            await this.login();
        }
        if (!this.userId) {
            await this.getUserId();
        }
    }

    /**
     * Convert HTML content to Substack's structured format
     * Substack uses a ProseMirror-like document structure
     */
    private htmlToSubstackBody(htmlContent: string): any {
        // Simple conversion - split by paragraphs and create structured content
        // This is a basic implementation; could be enhanced with more HTML parsing
        const paragraphs = htmlContent
            .split(/<\/p>|<br\s*\/?>/)
            .map(p => p.replace(/<p[^>]*>/gi, '').trim())
            .filter(p => p.length > 0);

        const content: any[] = [];

        for (const para of paragraphs) {
            // Check for headings
            const h1Match = para.match(/<h1[^>]*>(.*?)<\/h1>/i);
            const h2Match = para.match(/<h2[^>]*>(.*?)<\/h2>/i);
            const h3Match = para.match(/<h3[^>]*>(.*?)<\/h3>/i);

            if (h1Match) {
                content.push({
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: h1Match[1].replace(/<[^>]*>/g, '') }]
                });
            } else if (h2Match) {
                content.push({
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: h2Match[1].replace(/<[^>]*>/g, '') }]
                });
            } else if (h3Match) {
                content.push({
                    type: 'heading',
                    attrs: { level: 3 },
                    content: [{ type: 'text', text: h3Match[1].replace(/<[^>]*>/g, '') }]
                });
            } else {
                // Regular paragraph - strip HTML tags for now
                const text = para.replace(/<[^>]*>/g, '');
                if (text.trim().length > 0) {
                    content.push({
                        type: 'paragraph',
                        content: [{ type: 'text', text: text }]
                    });
                }
            }
        }

        return {
            type: 'doc',
            content: content.length > 0 ? content : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }]
        };
    }

    /**
     * Create a new blog post on Substack
     * @param title Post title
     * @param content Post content (HTML)
     * @param options Additional options (isDraft, subtitle, etc.)
     * @returns Created post data
     */
    async createPost(
        title: string, 
        content: string,
        options?: {
            isDraft?: boolean;
            subtitle?: string;
            publishedAt?: string;
        }
    ) {
        try {
            // Ensure authenticated before making requests
            await this.ensureAuthenticated();
            
            if (!this.userId) {
                throw new Error('User ID not available - authentication may have failed');
            }

            // Convert HTML to Substack's structured body format
            const draftBody = this.htmlToSubstackBody(content);

            // Create draft post following python-substack approach
            const postData: any = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                draft_title: title,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                draft_subtitle: options?.subtitle || '',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                draft_body: JSON.stringify(draftBody),
                // eslint-disable-next-line @typescript-eslint/naming-convention
                draft_bylines: [{ id: this.userId, is_guest: false }],
                audience: 'everyone', // or 'only_paid', 'founding', 'only_free'
                // eslint-disable-next-line @typescript-eslint/naming-convention
                write_comment_permissions: 'everyone',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                section_chosen: true
            };

            // Step 1: Create draft
            const draftResponse = await this.api.post('/drafts', postData);
            const draftId = draftResponse.data.id;

            // Step 2: If not keeping as draft, prepublish and publish
            if (!options?.isDraft) {
                // Prepublish validation
                await this.api.get(`/drafts/${draftId}/prepublish`);

                // Publish the draft
                const publishResponse = await this.api.post(`/drafts/${draftId}/publish`, {
                    send: true,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    share_automatically: false
                });

                return {
                    id: publishResponse.data.id,
                    title: publishResponse.data.title,
                    url: publishResponse.data.canonical_url || `https://${this.hostname}/p/${publishResponse.data.slug}`,
                    isDraft: false,
                    subtitle: publishResponse.data.subtitle
                };
            }

            return {
                id: draftResponse.data.id,
                title: draftResponse.data.title,
                url: `https://${this.hostname}/p/${draftResponse.data.slug}`,
                isDraft: true,
                subtitle: draftResponse.data.subtitle
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
                const authHint = this.email ? 
                    'Please check your email/password credentials.' : 
                    'You may need to obtain a fresh connect.sid cookie from your browser.';
                throw new Error(`Failed to create Substack post: ${errorMessage}. ${authHint}`);
            }
            throw new Error(`Failed to create Substack post: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Test the connection to Substack API
     * @returns Connection status
     */
    async testConnection() {
        try {
            // Ensure authenticated
            await this.ensureAuthenticated();
            
            // Test by trying to access user profile
            const response = await this.baseAPI.get('/user/profile/self');
            
            return {
                success: true,
                profile: {
                    id: response.data.id,
                    name: response.data.name,
                    hostname: this.hostname,
                    authenticated: true,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    auth_method: this.email ? 'email/password' : 'cookie'
                }
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    success: false,
                    error: error.response?.data?.message || error.message
                };
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
}
