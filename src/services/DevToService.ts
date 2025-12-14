import axios, { AxiosInstance } from 'axios';

export class DevToService {
    private api: AxiosInstance;

    constructor(apiKey: string) {
        if (!apiKey || apiKey.trim().length === 0) {
            throw new Error('Dev.to API key is required');
        }

        this.api = axios.create({
            baseURL: 'https://dev.to/api',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'Content-Type': 'application/json',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'api-key': apiKey
            }
        });
    }

    async createArticle(options: {
        title: string;
        bodyMarkdown: string;
        published: boolean;
        tags?: string[];
        description?: string;
        canonicalUrl?: string;
        series?: string;
        coverImage?: string;
    }) {
        try {
            const response = await this.api.post('/articles', {
                article: {
                    title: options.title,
                    published: options.published,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    body_markdown: options.bodyMarkdown,
                    tags: options.tags,
                    description: options.description,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    canonical_url: options.canonicalUrl,
                    series: options.series,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    cover_image: options.coverImage
                }
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.error?.trim() || 
                                 error.response?.data?.message?.trim() || 
                                 error.message?.trim() || 
                                 'Unknown error occurred';
                throw new Error(`Dev.to API Error: ${errorMsg}`);
            }
            throw error;
        }
    }

    async updateArticle(articleId: number, update: {
        title?: string;
        bodyMarkdown?: string;
        published?: boolean;
        tags?: string[];
        description?: string;
        canonicalUrl?: string;
        series?: string;
        coverImage?: string;
    }) {
        try {
            const response = await this.api.put(`/articles/${articleId}`, {
                article: {
                    title: update.title,
                    published: update.published,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    body_markdown: update.bodyMarkdown,
                    tags: update.tags,
                    description: update.description,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    canonical_url: update.canonicalUrl,
                    series: update.series,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    cover_image: update.coverImage
                }
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.error?.trim() || 
                                 error.response?.data?.message?.trim() || 
                                 error.message?.trim() || 
                                 'Unknown error occurred';
                throw new Error(`Dev.to API Error: ${errorMsg}`);
            }
            throw error;
        }
    }
}
