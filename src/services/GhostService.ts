import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export class GhostService {
    private api: AxiosInstance;
    private apiUrl: string;
    private apiKey: string;
    private apiKeyId: string;
    private apiKeySecret: string;

    constructor(apiUrl: string, apiKey: string) {
        // Remove trailing slash from URL
        this.apiUrl = apiUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
        
        // Parse the API key (format: id:secret)
        const [id, secret] = apiKey.split(':');
        if (!id || !secret) {
            throw new Error('Invalid Ghost API key format. Expected format: id:secret');
        }
        
        this.apiKeyId = id;
        this.apiKeySecret = secret;
        
        // Create axios instance for Ghost Admin API
        this.api = axios.create({
            baseURL: `${this.apiUrl}/ghost/api/admin`,
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Generate JWT token for Ghost Admin API authentication
     */
    private generateToken(): string {
        // Split the key into ID and SECRET
        const [id, secret] = this.apiKey.split(':');

        // Create the token (including decoding secret)
        const header = { alg: 'HS256', typ: 'JWT', kid: id };
        const payload = {
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 5 * 60, // 5 minutes
            aud: '/admin/'
        };

        // Encode header and payload
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        
        // Create signature
        const unsignedToken = `${encodedHeader}.${encodedPayload}`;
        const signature = crypto
            .createHmac('sha256', Buffer.from(secret, 'hex'))
            .update(unsignedToken)
            .digest('base64url');

        return `${unsignedToken}.${signature}`;
    }

    /**
     * Create a new blog post on Ghost
     * @param title Post title
     * @param content Post content (HTML or Mobiledoc)
     * @param options Additional options (status, tags, excerpt, featured, etc.)
     * @returns Created post data
     */
    async createPost(
        title: string, 
        content: string,
        options?: {
            status?: 'draft' | 'published' | 'scheduled';
            tags?: string[];
            excerpt?: string;
            featuredImage?: string;
            featured?: boolean;
            publishedAt?: string;
            customExcerpt?: string;
        }
    ) {
        try {
            // Ghost expects Mobiledoc format by default, but can also accept HTML
            // We'll convert HTML to a simple mobiledoc structure
            const mobiledoc = this.htmlToMobiledoc(content);

            const postData: any = {
                posts: [{
                    title: title,
                    mobiledoc: mobiledoc,
                    status: options?.status || 'draft'
                }]
            };

            // Add optional fields
            if (options?.tags && options.tags.length > 0) {
                postData.posts[0].tags = options.tags.map(tag => ({ name: tag }));
            }

            if (options?.excerpt || options?.customExcerpt) {
                postData.posts[0].custom_excerpt = options.excerpt || options.customExcerpt;
            }

            if (options?.featuredImage) {
                postData.posts[0].feature_image = options.featuredImage;
            }

            if (options?.featured !== undefined) {
                postData.posts[0].featured = options.featured;
            }

            if (options?.publishedAt) {
                postData.posts[0].published_at = options.publishedAt;
            }

            // Generate JWT token for authentication
            const token = this.generateToken();

            const response = await this.api.post('/posts/', postData, {
                params: {
                    source: 'html' // Tell Ghost we're sending HTML content
                },
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'Authorization': `Ghost ${token}`
                }
            });

            const post = response.data.posts[0];
            return {
                id: post.id,
                url: post.url,
                title: post.title,
                status: post.status,
                publishedAt: post.published_at,
                excerpt: post.custom_excerpt
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;
                throw new Error(`Failed to create Ghost post: ${errorMessage}`);
            }
            throw error;
        }
    }

    /**
     * Convert HTML to Mobiledoc format (simplified version)
     * 
     * LIMITATION: This uses Ghost's HTML card which preserves the HTML as-is.
     * While this maintains the content, it may not render optimally in Ghost's editor.
     * 
     * For production use, consider:
     * - Using a proper HTML-to-Mobiledoc converter library
     * - Converting to native Mobiledoc cards/atoms for better editor support
     * - Handling images, links, and rich formatting explicitly
     * 
     * Current implementation is sufficient for basic publishing but formatting
     * and structure from the TinyMCE editor may be lost in Ghost's editor.
     */
    private htmlToMobiledoc(html: string): string {
        // Create a simple mobiledoc structure with HTML card
        const mobiledoc = {
            version: '0.3.1',
            atoms: [],
            cards: [['html', { cardName: 'html', html: html }]],
            markups: [],
            sections: [[10, 0]]
        };
        return JSON.stringify(mobiledoc);
    }

    /**
     * Test the connection to Ghost API
     * @returns Site information if successful
     */
    async testConnection() {
        try {
            const token = this.generateToken();
            const response = await this.api.get('/site/', {
                headers: {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'Authorization': `Ghost ${token}`
                }
            });
            return {
                success: true,
                site: response.data.site
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    success: false,
                    error: error.response?.data?.errors?.[0]?.message || error.message
                };
            }
            return {
                success: false,
                error: 'Unknown error occurred'
            };
        }
    }
}
