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
     * @param options Additional options (status, date, excerpt, tags, categories)
     * @returns Created post data
     */
    async createPost(
        title: string, 
        content: string, 
        options?: {
            status?: string;
            date?: string;
            excerpt?: string;
            tags?: string[];
            categories?: string[];
        }
    ) {
        try {
            const postData: any = {
                title: title,
                content: content,
                status: options?.status || 'draft'
            };

            if (options?.date) {
                postData.date = options.date;
            }

            if (options?.excerpt) {
                postData.excerpt = options.excerpt;
            }

            // For tags and categories, we would need to map them to IDs
            // WordPress requires tag/category IDs, not names
            // For simplicity, we'll add them as comma-separated in the content meta
            // In a production app, you'd want to fetch existing tags/categories
            // and create new ones as needed
            if (options?.tags && options.tags.length > 0) {
                // Store tags as meta or handle appropriately
                // This is a simplified approach
            }

            if (options?.categories && options.categories.length > 0) {
                // Store categories as meta or handle appropriately
            }

            const response = await this.api.post('/posts', postData);

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
     * @param options Additional options (status, date, excerpt, tags, categories)
     * @returns Updated post data
     */
    async updatePost(
        postId: number, 
        title: string, 
        content: string, 
        options?: {
            status?: string;
            date?: string;
            excerpt?: string;
            tags?: string[];
            categories?: string[];
        }
    ) {
        try {
            const data: any = {
                title: title,
                content: content
            };

            if (options?.status) {
                data.status = options.status;
            }

            if (options?.date) {
                data.date = options.date;
            }

            if (options?.excerpt) {
                data.excerpt = options.excerpt;
            }

            // Note: WordPress requires tag/category IDs, not names.
            // Full tag/category support will be implemented in a future version.
            // For now, these fields are ignored during updates.

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
                    per_page: perPage,
                    status: 'publish'
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

    /**
     * Get a single post by ID
     * @param postId Post ID
     * @returns Post data
     */
    async getPost(postId: number) {
        try {
            const response = await this.api.get(`/posts/${postId}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`WordPress API Error: ${error.response?.data?.message || error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get tag names by IDs
     * @param tagIds Array of tag IDs
     * @returns Array of tag names
     */
    async getTagNames(tagIds: number[]): Promise<string[]> {
        if (!tagIds || tagIds.length === 0) {
            return [];
        }
        try {
            const response = await this.api.get('/tags', {
                params: {
                    include: tagIds.join(','),
                    per_page: 100
                }
            });
            return response.data.map((tag: any) => tag.name);
        } catch (error) {
            console.error('Failed to fetch tag names:', error);
            return [];
        }
    }

    /**
     * Get category names by IDs
     * @param categoryIds Array of category IDs
     * @returns Array of category names
     */
    async getCategoryNames(categoryIds: number[]): Promise<string[]> {
        if (!categoryIds || categoryIds.length === 0) {
            return [];
        }
        try {
            const response = await this.api.get('/categories', {
                params: {
                    include: categoryIds.join(','),
                    per_page: 100
                }
            });
            return response.data.map((cat: any) => cat.name);
        } catch (error) {
            console.error('Failed to fetch category names:', error);
            return [];
        }
    }
}
