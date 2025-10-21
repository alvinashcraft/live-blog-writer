import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface DraftMetadata {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    wordCount: number;
    platform?: string;
    status?: string;
}

export interface DraftContent {
    metadata: DraftMetadata;
    title: string;
    content: string;
    publishDate?: string;
    tags?: string[];
    categories?: string[];
    excerpt?: string;
    status?: string;
}

export class DraftManager {
    private readonly draftsFolder: string;
    private readonly metadataFile: string;

    constructor() {
        // Use Documents/LiveBlogWriter folder
        const documentsPath = path.join(os.homedir(), 'Documents');
        this.draftsFolder = path.join(documentsPath, 'LiveBlogWriter', 'Drafts');
        this.metadataFile = path.join(this.draftsFolder, '.metadata.json');
        
        // Ensure drafts folder exists
        this.ensureDraftsFolderExists();
    }

    private ensureDraftsFolderExists(): void {
        try {
            if (!fs.existsSync(this.draftsFolder)) {
                fs.mkdirSync(this.draftsFolder, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to create drafts folder:', error);
            vscode.window.showErrorMessage('Failed to create drafts folder in Documents.');
        }
    }

    private generateDraftId(): string {
        return `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private getDraftFilePath(draftId: string): string {
        return path.join(this.draftsFolder, `${draftId}.json`);
    }

    private async loadMetadata(): Promise<DraftMetadata[]> {
        try {
            if (!fs.existsSync(this.metadataFile)) {
                return [];
            }
            const data = fs.readFileSync(this.metadataFile, 'utf8');
            const metadata = JSON.parse(data);
            // Convert date strings back to Date objects
            return metadata.map((draft: any) => ({
                ...draft,
                createdAt: new Date(draft.createdAt),
                updatedAt: new Date(draft.updatedAt)
            }));
        } catch (error) {
            console.error('Failed to load metadata:', error);
            return [];
        }
    }

    private async saveMetadata(metadata: DraftMetadata[]): Promise<void> {
        try {
            const data = JSON.stringify(metadata, null, 2);
            fs.writeFileSync(this.metadataFile, data, 'utf8');
        } catch (error) {
            console.error('Failed to save metadata:', error);
            throw new Error('Failed to save draft metadata');
        }
    }

    private countWords(text: string): number {
        return text.trim() ? text.trim().split(/\s+/).length : 0;
    }

    private stripHtml(html: string): string {
        // Simple HTML tag removal for word counting
        return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
    }

    public async saveDraft(draftContent: Partial<DraftContent>, existingDraftId?: string): Promise<string> {
        try {
            const now = new Date();
            const draftId = existingDraftId || this.generateDraftId();
            const draftPath = this.getDraftFilePath(draftId);

            // Calculate word count from content
            const plainTextContent = this.stripHtml(draftContent.content || '');
            const wordCount = this.countWords(plainTextContent);

            // Load existing metadata
            const allMetadata = await this.loadMetadata();
            const existingMetadataIndex = allMetadata.findIndex(m => m.id === draftId);

            // Create or update metadata
            const metadata: DraftMetadata = {
                id: draftId,
                title: draftContent.title || 'Untitled Draft',
                createdAt: existingMetadataIndex >= 0 ? allMetadata[existingMetadataIndex].createdAt : now,
                updatedAt: now,
                wordCount: wordCount,
                platform: draftContent.status ? 'wordpress' : undefined, // Infer platform if needed
                status: draftContent.status || 'draft'
            };

            // Create complete draft content
            const completeDraft: DraftContent = {
                metadata,
                title: draftContent.title || '',
                content: draftContent.content || '',
                publishDate: draftContent.publishDate,
                tags: draftContent.tags || [],
                categories: draftContent.categories || [],
                excerpt: draftContent.excerpt,
                status: draftContent.status || 'draft'
            };

            // Save draft file
            fs.writeFileSync(draftPath, JSON.stringify(completeDraft, null, 2), 'utf8');

            // Update metadata
            if (existingMetadataIndex >= 0) {
                allMetadata[existingMetadataIndex] = metadata;
            } else {
                allMetadata.push(metadata);
            }

            // Sort by updated date (most recent first)
            allMetadata.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

            await this.saveMetadata(allMetadata);

            return draftId;
        } catch (error) {
            console.error('Failed to save draft:', error);
            throw new Error(`Failed to save draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public async loadDraft(draftId: string): Promise<DraftContent | null> {
        try {
            const draftPath = this.getDraftFilePath(draftId);
            if (!fs.existsSync(draftPath)) {
                return null;
            }

            const data = fs.readFileSync(draftPath, 'utf8');
            const draft = JSON.parse(data);
            
            // Convert date strings back to Date objects
            draft.metadata.createdAt = new Date(draft.metadata.createdAt);
            draft.metadata.updatedAt = new Date(draft.metadata.updatedAt);

            return draft;
        } catch (error) {
            console.error('Failed to load draft:', error);
            return null;
        }
    }

    public async listDrafts(): Promise<DraftMetadata[]> {
        return await this.loadMetadata();
    }

    public async deleteDraft(draftId: string): Promise<boolean> {
        try {
            const draftPath = this.getDraftFilePath(draftId);
            
            // Remove file if it exists
            if (fs.existsSync(draftPath)) {
                fs.unlinkSync(draftPath);
            }

            // Remove from metadata
            const allMetadata = await this.loadMetadata();
            const filteredMetadata = allMetadata.filter(m => m.id !== draftId);
            await this.saveMetadata(filteredMetadata);

            return true;
        } catch (error) {
            console.error('Failed to delete draft:', error);
            return false;
        }
    }

    public async getRecentDrafts(limit: number = 10): Promise<DraftMetadata[]> {
        const allDrafts = await this.listDrafts();
        return allDrafts.slice(0, limit);
    }

    public async cleanupOldDrafts(olderThanDays: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            const allMetadata = await this.loadMetadata();
            const toDelete = allMetadata.filter(draft => draft.updatedAt < cutoffDate);

            let deletedCount = 0;
            for (const draft of toDelete) {
                if (await this.deleteDraft(draft.id)) {
                    deletedCount++;
                }
            }

            return deletedCount;
        } catch (error) {
            console.error('Failed to cleanup old drafts:', error);
            return 0;
        }
    }

    public getDraftsFolder(): string {
        return this.draftsFolder;
    }
}