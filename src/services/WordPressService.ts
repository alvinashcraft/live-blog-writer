import axios, { AxiosInstance } from 'axios';

export class WordPressService {
    private api: AxiosInstance;
    private siteUrl: string;

    constructor(siteUrl: string, username: string, applicationPassword: string) {
        this.siteUrl = siteUrl.replace(/\/$/, ''); // Remove trailing slash
        
        // Create axios instance with basic auth
        this.api = axios.create({
            baseURL: `${this.siteUrl}/wp-json/wp/v2`,
            auth: {
                username: username,
                password: applicationPassword
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Create a new blog post
     * @param title Post title
     * @param content Post content (HTML)
     * @param status Post status (draft, publish, etc.)
     * @returns Created post data
     */
    async createPost(title: string, content: string, status: string = 'draft') {
        try {
            const response = await this.api.post('/posts', {
                title: title,
                content: content,
                status: status
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`WordPress API Error: ${error.response?.data?.message || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Update an existing blog post
     * @param postId Post ID
     * @param title Post title
     * @param content Post content (HTML)
     * @param status Post status
     * @returns Updated post data
     */
    async updatePost(postId: number, title: string, content: string, status?: string) {
        try {
            const data: any = {
                title: title,
                content: content
            };

            if (status) {
                data.status = status;
            }

            const response = await this.api.put(`/posts/${postId}`, data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`WordPress API Error: ${error.response?.data?.message || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get a list of posts
     * @param page Page number
     * @param perPage Number of posts per page
     * @returns Array of posts
     */
    async getPosts(page: number = 1, perPage: number = 10) {
        try {
            const response = await this.api.get('/posts', {
                params: {
                    page: page,
                    per_page: perPage
                }
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`WordPress API Error: ${error.response?.data?.message || error.message}`);
            }
            throw error;
        }
    }
}
