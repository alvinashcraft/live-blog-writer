import axios, { AxiosInstance } from 'axios';

export class MediumService {
    private api: AxiosInstance;
    private integrationToken: string;
    private userId: string | null = null;

    constructor(integrationToken: string, username?: string) {
        this.integrationToken = integrationToken;
        
        // Create axios instance for Medium API with Bearer token
        this.api = axios.create({
            baseURL: 'https://api.medium.com/v1',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Accept': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Authorization': `Bearer ${integrationToken}`
            }
        });
    }

    /**
     * Fetch the authenticated user's ID
     * This is required before publishing posts
     */
    async getUserId(): Promise<string> {
        if (this.userId) {
            return this.userId;
        }

        try {
            const response = await this.api.get('/me');
            this.userId = response.data.data.id;
            return this.userId!;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to fetch Medium user ID: ${error.response?.data?.errors?.[0]?.message || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Create a new blog post on Medium
     * @param title Post title
     * @param content Post content (HTML or Markdown)
     * @param options Additional options (contentFormat, publishStatus, tags)
     * @returns Created post data
     */
    async createPost(
        title: string, 
        content: string,
        options?: {
            contentFormat?: 'html' | 'markdown';
            publishStatus?: 'public' | 'draft' | 'unlisted';
            tags?: string[];
            canonicalUrl?: string;
            notifyFollowers?: boolean;
        }
    ) {
        try {
            // Get user ID first
            const userId = await this.getUserId();

            const postData: any = {
                title: title,
                contentFormat: options?.contentFormat || 'html',
                content: content,
                publishStatus: options?.publishStatus || 'draft'
            };

            if (options?.tags && options.tags.length > 0) {
                // Medium allows up to 5 tags
                postData.tags = options.tags.slice(0, 5);
            }

            if (options?.canonicalUrl) {
                postData.canonicalUrl = options.canonicalUrl;
            }

            if (options?.notifyFollowers !== undefined) {
                postData.notifyFollowers = options.notifyFollowers;
            }

            const response = await this.api.post(`/users/${userId}/posts`, postData);

            return {
                id: response.data.data.id,
                url: response.data.data.url,
                title: response.data.data.title,
                publishStatus: response.data.data.publishStatus,
                canonicalUrl: response.data.data.canonicalUrl,
                tags: response.data.data.tags
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;
                throw new Error(`Failed to create Medium post: ${errorMessage}`);
            }
            throw error;
        }
    }

    /**
     * Test the connection to Medium API
     * @returns User information if successful
     */
    async testConnection() {
        try {
            const response = await this.api.get('/me');
            return {
                success: true,
                user: response.data.data
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
