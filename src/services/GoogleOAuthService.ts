import * as vscode from 'vscode';
import * as http from 'http';
import axios from 'axios';

// Default OAuth credentials for the extension
// These are embedded for ease of use. Advanced users can override via settings.
// Note: For desktop apps, the client secret cannot be truly "secret" - this is expected by OAuth providers
const DEFAULT_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const DEFAULT_CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';

const OAUTH_REDIRECT_URI = 'http://localhost:54321/callback';
const OAUTH_SCOPES = ['https://www.googleapis.com/auth/blogger'];
const TOKEN_STORAGE_KEY = 'liveBlogWriter.blogger.token';
const REFRESH_TOKEN_STORAGE_KEY = 'liveBlogWriter.blogger.refreshToken';
const TOKEN_EXPIRY_KEY = 'liveBlogWriter.blogger.tokenExpiry';
const CLIENT_ID_STORAGE_KEY = 'liveBlogWriter.blogger.customClientId';
const CLIENT_SECRET_STORAGE_KEY = 'liveBlogWriter.blogger.customClientSecret';

interface TokenResponse {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    access_token: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    refresh_token?: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    expires_in: number;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    token_type: string;
}

export class GoogleOAuthService {
    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Get OAuth Client ID - uses custom if set, otherwise default
     */
    private async getClientId(): Promise<string> {
        const customClientId = await this.context.secrets.get(CLIENT_ID_STORAGE_KEY);
        if (customClientId) {
            return customClientId;
        }
        
        // Use default embedded client ID
        if (DEFAULT_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
            throw new Error('OAuth Client ID not configured. Please set up credentials.');
        }
        return DEFAULT_CLIENT_ID;
    }

    /**
     * Get OAuth Client Secret - uses custom if set, otherwise default
     */
    private async getClientSecret(): Promise<string> {
        const customClientSecret = await this.context.secrets.get(CLIENT_SECRET_STORAGE_KEY);
        if (customClientSecret) {
            return customClientSecret;
        }
        
        // Use default embedded client secret
        if (DEFAULT_CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
            throw new Error('OAuth Client Secret not configured. Please set up credentials.');
        }
        return DEFAULT_CLIENT_SECRET;
    }

    /**
     * Set custom OAuth Client ID and Secret (optional - for advanced users)
     */
    async setCustomClientCredentials(clientId: string, clientSecret: string): Promise<void> {
        await this.context.secrets.store(CLIENT_ID_STORAGE_KEY, clientId);
        await this.context.secrets.store(CLIENT_SECRET_STORAGE_KEY, clientSecret);
    }

    /**
     * Clear custom OAuth credentials (revert to defaults)
     */
    async clearCustomClientCredentials(): Promise<void> {
        await this.context.secrets.delete(CLIENT_ID_STORAGE_KEY);
        await this.context.secrets.delete(CLIENT_SECRET_STORAGE_KEY);
    }

    /**
     * Check if using custom credentials
     */
    async isUsingCustomCredentials(): Promise<boolean> {
        const customClientId = await this.context.secrets.get(CLIENT_ID_STORAGE_KEY);
        return customClientId !== undefined;
    }

    /**
     * Authenticate with Google OAuth and get access token
     */
    async authenticate(): Promise<string> {
        // Get client credentials (custom or default)
        // Errors will be thrown by getClientId/getClientSecret if not configured
        const clientId = await this.getClientId();
        const clientSecret = await this.getClientSecret();

        // Check if we have a valid cached token
        const cachedToken = await this.getCachedToken();
        if (cachedToken) {
            return cachedToken;
        }

        // Start OAuth flow
        const authCode = await this.getAuthorizationCode();
        const tokenResponse = await this.exchangeCodeForToken(authCode);
        
        // Store tokens
        await this.storeTokens(tokenResponse);
        
        return tokenResponse.access_token;
    }

    /**
     * Get cached token if valid, or refresh if expired
     */
    private async getCachedToken(): Promise<string | null> {
        const token = await this.context.secrets.get(TOKEN_STORAGE_KEY);
        const expiryStr = await this.context.secrets.get(TOKEN_EXPIRY_KEY);
        
        if (!token || !expiryStr) {
            return null;
        }

        const expiry = parseInt(expiryStr, 10);
        const now = Date.now();

        // If token expires in less than 5 minutes, refresh it
        if (now >= expiry - 300000) {
            const refreshToken = await this.context.secrets.get(REFRESH_TOKEN_STORAGE_KEY);
            if (refreshToken) {
                try {
                    const newToken = await this.refreshAccessToken(refreshToken);
                    return newToken;
                } catch (error) {
                    // Refresh failed, need to re-authenticate
                    return null;
                }
            }
            return null;
        }

        return token;
    }

    /**
     * Refresh access token using refresh token
     */
    private async refreshAccessToken(refreshToken: string): Promise<string> {
        const clientId = await this.getClientId();
        const clientSecret = await this.getClientSecret();

        try {
            const response = await axios.post<TokenResponse>('https://oauth2.googleapis.com/token', {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                client_id: clientId,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                client_secret: clientSecret,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                refresh_token: refreshToken,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                grant_type: 'refresh_token'
            });

            await this.storeTokens(response.data);
            return response.data.access_token;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
                throw new Error(`Failed to refresh token: ${errorMsg}`);
            }
            throw error;
        }
    }

    /**
     * Get authorization code from Google OAuth
     */
    private async getAuthorizationCode(): Promise<string> {
        const state = this.generateRandomState();
        const authUrl = await this.buildAuthUrl(state);

        return new Promise((resolve, reject) => {

            // Create temporary HTTP server to receive callback
            const server = http.createServer(async (req, res) => {
                if (req.url?.startsWith('/callback')) {
                    const url = new URL(req.url, OAUTH_REDIRECT_URI);
                    const code = url.searchParams.get('code');
                    const returnedState = url.searchParams.get('state');
                    const error = url.searchParams.get('error');

                    if (error) {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Authentication Failed</h1><p>You can close this window.</p></body></html>');
                        server.close();
                        reject(new Error(`OAuth error: ${error}`));
                        return;
                    }

                    if (returnedState !== state) {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Authentication Failed</h1><p>Invalid state parameter.</p></body></html>');
                        server.close();
                        reject(new Error('Invalid state parameter'));
                        return;
                    }

                    if (code) {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Authentication Successful!</h1><p>You can close this window and return to VS Code.</p></body></html>');
                        server.close();
                        resolve(code);
                    } else {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Authentication Failed</h1><p>No authorization code received.</p></body></html>');
                        server.close();
                        reject(new Error('No authorization code received'));
                    }
                }
            });

            server.listen(54321, () => {
                vscode.env.openExternal(vscode.Uri.parse(authUrl));
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timeout'));
            }, 300000);
        });
    }

    /**
     * Exchange authorization code for access token
     */
    private async exchangeCodeForToken(code: string): Promise<TokenResponse> {
        const clientId = await this.getClientId();
        const clientSecret = await this.getClientSecret();

        try {
            const response = await axios.post<TokenResponse>('https://oauth2.googleapis.com/token', {
                code,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                client_id: clientId,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                client_secret: clientSecret,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                redirect_uri: OAUTH_REDIRECT_URI,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                grant_type: 'authorization_code'
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
                throw new Error(`Failed to exchange authorization code: ${errorMsg}`);
            }
            throw error;
        }
    }

    /**
     * Store tokens securely
     */
    private async storeTokens(tokenResponse: TokenResponse): Promise<void> {
        await this.context.secrets.store(TOKEN_STORAGE_KEY, tokenResponse.access_token);
        
        if (tokenResponse.refresh_token) {
            await this.context.secrets.store(REFRESH_TOKEN_STORAGE_KEY, tokenResponse.refresh_token);
        }

        const expiry = Date.now() + (tokenResponse.expires_in * 1000);
        await this.context.secrets.store(TOKEN_EXPIRY_KEY, expiry.toString());
    }

    /**
     * Build Google OAuth authorization URL
     */
    private async buildAuthUrl(state: string): Promise<string> {
        const clientId = await this.getClientId();

        const params = new URLSearchParams({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            client_id: clientId,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            redirect_uri: OAUTH_REDIRECT_URI,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            response_type: 'code',
            scope: OAUTH_SCOPES.join(' '),
            state,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            access_type: 'offline',
            prompt: 'consent'
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    /**
     * Generate random state for CSRF protection
     */
    private generateRandomState(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Clear stored authentication
     */
    async clearAuthentication(): Promise<void> {
        await this.context.secrets.delete(TOKEN_STORAGE_KEY);
        await this.context.secrets.delete(REFRESH_TOKEN_STORAGE_KEY);
        await this.context.secrets.delete(TOKEN_EXPIRY_KEY);
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const token = await this.getCachedToken();
        return token !== null;
    }
}
