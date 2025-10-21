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
        // Use the proper Documents folder (handles OneDrive redirection on Windows)
        const documentsPath = this.getDocumentsPath();
        this.draftsFolder = path.join(documentsPath, 'LiveBlogWriter', 'Drafts');
        this.metadataFile = path.join(this.draftsFolder, '.metadata.json');
        
        // Ensure drafts folder exists
        this.ensureDraftsFolderExists();
    }

    private getDocumentsPath(): string {
        // On Windows, try to get the actual Documents folder which might be redirected to OneDrive
        if (process.platform === 'win32') {
            // First, try to get the actual Documents folder from Windows shell folders
            try {
                const { execSync } = require('child_process');
                // Use PowerShell to get the actual Documents folder location from Windows registry
                const result = execSync(
                    'powershell -Command "Get-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders\' -Name \'Personal\' | Select-Object -ExpandProperty Personal"',
                    { encoding: 'utf8', timeout: 5000 }
                ).toString().trim();
                
                if (result && fs.existsSync(result)) {
                    // Test write access
                    try {
                        const testFile = path.join(result, '.live-blog-writer-test');
                        fs.writeFileSync(testFile, 'test');
                        fs.unlinkSync(testFile);
                        console.log('Using Windows registry Documents path:', result);
                        return result;
                    } catch {
                        console.log('No write access to registry Documents path:', result);
                    }
                }
            } catch (error) {
                console.log('Failed to read Windows registry Documents path:', error);
            }

            // Fallback to environment variables and common paths
            const userProfile = process.env.USERPROFILE;
            const oneDriveDocuments = process.env.OneDrive ? path.join(process.env.OneDrive, 'Documents') : null;
            const oneDriveConsumerDocs = process.env.OneDriveConsumer ? path.join(process.env.OneDriveConsumer, 'Documents') : null;
            const oneDriveCommercialDocs = process.env.OneDriveCommercial ? path.join(process.env.OneDriveCommercial, 'Documents') : null;
            
            // Also check for Documents2, Documents3, etc. (OneDrive sometimes creates these)
            const oneDriveVariants = [];
            if (process.env.OneDrive) {
                for (let i = 2; i <= 5; i++) {
                    oneDriveVariants.push(path.join(process.env.OneDrive, `Documents${i}`));
                }
            }
            
            // Check candidate paths in order of preference
            const candidatePaths = [
                oneDriveDocuments,
                ...oneDriveVariants,
                oneDriveConsumerDocs,
                oneDriveCommercialDocs,
                userProfile ? path.join(userProfile, 'Documents') : null,
                path.join(os.homedir(), 'Documents')
            ].filter(Boolean) as string[];
            
            // Return the first existing Documents folder with write access
            for (const candidatePath of candidatePaths) {
                if (fs.existsSync(candidatePath)) {
                    try {
                        // Test write access
                        const testFile = path.join(candidatePath, '.live-blog-writer-test');
                        fs.writeFileSync(testFile, 'test');
                        fs.unlinkSync(testFile);
                        console.log('Using fallback Documents path:', candidatePath);
                        return candidatePath;
                    } catch {
                        // Continue to next candidate if no write access
                        continue;
                    }
                }
            }
        }
        
        // Fallback for non-Windows or if no suitable folder found
        return path.join(os.homedir(), 'Documents');
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
        return `draft-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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