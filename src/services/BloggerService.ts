import axios, { AxiosInstance } from 'axios';

export class BloggerService {
    private api: AxiosInstance;
    private blogId: string;
    private accessToken: string;

    constructor(blogId: string, accessToken: string) {
        this.blogId = blogId;
        this.accessToken = accessToken;
        
        // Create axios instance for Blogger API with OAuth 2.0 token
        this.api = axios.create({
            baseURL: 'https://www.googleapis.com/blogger/v3',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Authorization': `Bearer ${accessToken}`
            }
        });
    }

    /**
     * Create a new blog post
     * @param title Post title
     * @param content Post content (HTML)
     * @param options Additional options (published date, labels, draft status)
     * @returns Created post data
     */
    async createPost(
        title: string, 
        content: string,
        options?: {
            published?: string;
            labels?: string[];
            isDraft?: boolean;
        }
    ) {
        try {
            const postData: any = {
                kind: 'blogger#post',
                blog: {
                    id: this.blogId
                },
                title: title,
                content: content
            };

            if (options?.published) {
                postData.published = options.published;
            }

            if (options?.labels && options.labels.length > 0) {
                postData.labels = options.labels;
            }

            // Determine the endpoint and parameters based on draft status
            const isDraft = options?.isDraft ?? false;
            const endpoint = `/blogs/${this.blogId}/posts`;
            const params: { isDraft?: boolean } = {};
            
            if (isDraft) {
                params.isDraft = true;
            }

            const response = await this.api.post(
                endpoint,
                postData,
                { params }
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
     * @param options Additional options (labels, published date)
     * @returns Updated post data
     */
    async updatePost(
        postId: string, 
        title: string, 
        content: string,
        options?: {
            labels?: string[];
            published?: string;
        }
    ) {
        try {
            const postData: any = {
                kind: 'blogger#post',
                id: postId,
                blog: {
                    id: this.blogId
                },
                title: title,
                content: content
            };

            if (options?.labels && options.labels.length > 0) {
                postData.labels = options.labels;
            }

            if (options?.published) {
                postData.published = options.published;
            }

            const response = await this.api.put(
                `/blogs/${this.blogId}/posts/${postId}`,
                postData
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
                        maxResults: maxResults,
                        status: 'live'
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

    /**
     * Get a single post by ID
     * @param postId Post ID
     * @returns Post data
     */
    async getPost(postId: string) {
        try {
            const response = await this.api.get(
                `/blogs/${this.blogId}/posts/${postId}`
            );

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Blogger API Error: ${error.response?.data?.error?.message || error.message}`);
            }
            throw error;
        }
    }
}
