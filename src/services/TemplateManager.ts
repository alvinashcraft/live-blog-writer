import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TemplateMetadata {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    contentFormat?: 'html' | 'markdown';
}

export interface TemplateContent {
    metadata: TemplateMetadata;
    title: string;
    content: string;
    contentFormat?: 'html' | 'markdown';
    tags?: string[];
    categories?: string[];
    excerpt?: string;
}

export class TemplateManager {
    private readonly templatesFolder: string;
    private readonly metadataFile: string;

    constructor() {
        const documentsPath = this.getDocumentsPath();
        this.templatesFolder = path.join(documentsPath, 'LiveBlogWriter', 'Templates');
        this.metadataFile = path.join(this.templatesFolder, '.metadata.json');

        this.ensureTemplatesFolderExists();
    }

    private getDocumentsPath(): string {
        if (process.platform === 'win32') {
            try {
                const { execSync } = require('child_process');
                const result = execSync(
                    'powershell -Command "Get-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders\' -Name \'Personal\' | Select-Object -ExpandProperty Personal"',
                    { encoding: 'utf8', timeout: 5000 }
                ).toString().trim();

                if (result && fs.existsSync(result)) {
                    try {
                        const testFile = path.join(result, '.live-blog-writer-test');
                        fs.writeFileSync(testFile, 'test');
                        fs.unlinkSync(testFile);
                        return result;
                    } catch {
                        // No write access
                    }
                }
            } catch {
                // Registry lookup failed
            }

            const userProfile = process.env.USERPROFILE;
            const oneDriveDocuments = process.env.OneDrive ? path.join(process.env.OneDrive, 'Documents') : null;
            const oneDriveConsumerDocs = process.env.OneDriveConsumer ? path.join(process.env.OneDriveConsumer, 'Documents') : null;
            const oneDriveCommercialDocs = process.env.OneDriveCommercial ? path.join(process.env.OneDriveCommercial, 'Documents') : null;

            const candidatePaths = [
                oneDriveDocuments,
                oneDriveConsumerDocs,
                oneDriveCommercialDocs,
                userProfile ? path.join(userProfile, 'Documents') : null,
                path.join(os.homedir(), 'Documents')
            ].filter(Boolean) as string[];

            for (const candidatePath of candidatePaths) {
                if (fs.existsSync(candidatePath)) {
                    try {
                        const testFile = path.join(candidatePath, '.live-blog-writer-test');
                        fs.writeFileSync(testFile, 'test');
                        fs.unlinkSync(testFile);
                        return candidatePath;
                    } catch {
                        continue;
                    }
                }
            }
        }

        return path.join(os.homedir(), 'Documents');
    }

    private ensureTemplatesFolderExists(): void {
        try {
            if (!fs.existsSync(this.templatesFolder)) {
                fs.mkdirSync(this.templatesFolder, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to create templates folder:', error);
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to create templates folder in Documents.'));
        }
    }

    private generateTemplateId(): string {
        return `template-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    private getTemplateFilePath(templateId: string): string {
        return path.join(this.templatesFolder, `${templateId}.json`);
    }

    private async loadMetadata(): Promise<TemplateMetadata[]> {
        try {
            if (!fs.existsSync(this.metadataFile)) {
                return [];
            }
            const data = fs.readFileSync(this.metadataFile, 'utf8');
            const metadata = JSON.parse(data);
            return metadata.map((tmpl: TemplateMetadata) => ({
                ...tmpl,
                createdAt: new Date(tmpl.createdAt),
                updatedAt: new Date(tmpl.updatedAt)
            }));
        } catch (error) {
            console.error('Failed to load template metadata:', error);
            return [];
        }
    }

    private async saveMetadata(metadata: TemplateMetadata[]): Promise<void> {
        try {
            const data = JSON.stringify(metadata, null, 2);
            fs.writeFileSync(this.metadataFile, data, 'utf8');
        } catch (error) {
            console.error('Failed to save template metadata:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(String(error));
        }
    }

    public async saveTemplate(name: string, templateContent: Partial<TemplateContent>): Promise<string> {
        try {
            const now = new Date();
            const templateId = this.generateTemplateId();
            const templatePath = this.getTemplateFilePath(templateId);

            const metadata: TemplateMetadata = {
                id: templateId,
                name: name,
                createdAt: now,
                updatedAt: now,
                contentFormat: templateContent.contentFormat
            };

            const completeTemplate: TemplateContent = {
                metadata,
                title: templateContent.title || '',
                content: templateContent.content || '',
                contentFormat: templateContent.contentFormat,
                tags: templateContent.tags || [],
                categories: templateContent.categories || [],
                excerpt: templateContent.excerpt
            };

            fs.writeFileSync(templatePath, JSON.stringify(completeTemplate, null, 2), 'utf8');

            const allMetadata = await this.loadMetadata();
            allMetadata.push(metadata);
            allMetadata.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            await this.saveMetadata(allMetadata);

            return templateId;
        } catch (error) {
            console.error('Failed to save template:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Unknown error while saving template');
        }
    }

    public async loadTemplate(templateId: string): Promise<TemplateContent | null> {
        try {
            const templatePath = this.getTemplateFilePath(templateId);
            if (!fs.existsSync(templatePath)) {
                return null;
            }

            const data = fs.readFileSync(templatePath, 'utf8');
            const template = JSON.parse(data);

            template.metadata.createdAt = new Date(template.metadata.createdAt);
            template.metadata.updatedAt = new Date(template.metadata.updatedAt);

            return template;
        } catch (error) {
            console.error('Failed to load template:', error);
            return null;
        }
    }

    public async listTemplates(): Promise<TemplateMetadata[]> {
        return await this.loadMetadata();
    }

    public async deleteTemplate(templateId: string): Promise<boolean> {
        try {
            const templatePath = this.getTemplateFilePath(templateId);

            if (fs.existsSync(templatePath)) {
                fs.unlinkSync(templatePath);
            }

            const allMetadata = await this.loadMetadata();
            const filteredMetadata = allMetadata.filter(m => m.id !== templateId);
            await this.saveMetadata(filteredMetadata);

            return true;
        } catch (error) {
            console.error('Failed to delete template:', error);
            return false;
        }
    }
}
