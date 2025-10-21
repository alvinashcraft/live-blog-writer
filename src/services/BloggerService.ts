import axios, { AxiosInstance } from 'axios';

export class BloggerService {
    private api: AxiosInstance;
    private blogId: string;
    private apiKey: string;

    constructor(blogId: string, apiKey: string) {
        this.blogId = blogId;
        this.apiKey = apiKey;
        
        // Create axios instance for Blogger API
        this.api = axios.create({
            baseURL: 'https://www.googleapis.com/blogger/v3',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Create a new blog post
     * @param title Post title
     * @param content Post content (HTML)
     * @returns Created post data
     */
    async createPost(title: string, content: string) {
        try {
            const response = await this.api.post(
                `/blogs/${this.blogId}/posts`,
                {
                    kind: 'blogger#post',
                    blog: {
                        id: this.blogId
                    },
                    title: title,
                    content: content
                },
                {
                    params: {
                        key: this.apiKey
                    }
                }
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Blogger API Error: ${error.response?.data?.error?.message || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Update an existing blog post
     * @param postId Post ID
     * @param title Post title
     * @param content Post content (HTML)
     * @returns Updated post data
     */
    async updatePost(postId: string, title: string, content: string) {
        try {
            const response = await this.api.put(
                `/blogs/${this.blogId}/posts/${postId}`,
                {
                    kind: 'blogger#post',
                    id: postId,
                    blog: {
                        id: this.blogId
                    },
                    title: title,
                    content: content
                },
                {
                    params: {
                        key: this.apiKey
                    }
                }
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Blogger API Error: ${error.response?.data?.error?.message || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get a list of posts
     * @param maxResults Maximum number of posts to retrieve
     * @returns Array of posts
     */
    async getPosts(maxResults: number = 10) {
        try {
            const response = await this.api.get(
                `/blogs/${this.blogId}/posts`,
                {
                    params: {
                        key: this.apiKey,
                        maxResults: maxResults
                    }
                }
            );

            return response.data.items || [];
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Blogger API Error: ${error.response?.data?.error?.message || error.message}`);
            }
            throw error;
        }
    }
}
