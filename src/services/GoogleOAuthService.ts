import * as vscode from 'vscode';
import * as http from 'http';
import * as crypto from 'crypto';
import axios from 'axios';

// Default OAuth credentials for the extension
// These are embedded for ease of use. Advanced users can override via settings.
// Note: For desktop apps, the client secret cannot be truly "secret" - this is expected by OAuth providers
// @ts-ignore - INJECTED_CLIENT_ID and INJECTED_CLIENT_SECRET are defined by webpack at build time
const DEFAULT_CLIENT_ID = typeof INJECTED_CLIENT_ID !== 'undefined' ? INJECTED_CLIENT_ID : 'YOUR_CLIENT_ID_HERE';
// @ts-ignore
const DEFAULT_CLIENT_SECRET = typeof INJECTED_CLIENT_SECRET !== 'undefined' ? INJECTED_CLIENT_SECRET : 'YOUR_CLIENT_SECRET_HERE';

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
     * Check if default OAuth credentials are configured (injected at build time)
     */
    hasDefaultCredentials(): boolean {
        return DEFAULT_CLIENT_ID !== 'YOUR_CLIENT_ID_HERE' && 
               DEFAULT_CLIENT_ID !== '' &&
               DEFAULT_CLIENT_SECRET !== 'YOUR_CLIENT_SECRET_HERE' &&
               DEFAULT_CLIENT_SECRET !== '';
    }

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
            throw new Error('OAuth Client Secret not configured. This is a build configuration issue: the extension was packaged without valid OAuth credentials. Please contact the extension author or maintainer.');
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
        // Check if we have a valid cached token
        const cachedToken = await this.getCachedToken();
        if (cachedToken) {
            return cachedToken;
        }

        // Start OAuth flow with PKCE
        // Generate PKCE code verifier and challenge
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        
        // Note: Client credentials will be retrieved by the methods that need them
        const authCode = await this.getAuthorizationCode(codeChallenge);
        const tokenResponse = await this.exchangeCodeForToken(authCode, codeVerifier);
        
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
        
        // Validate expiry data - if corrupted, clear cache and require re-auth
        if (isNaN(expiry)) {
            return null;
        }
        
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
     * If refresh fails (e.g., refresh token revoked/invalid), the caller should handle re-authentication
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
                const errorType = error.response?.data?.error;
                
                // If refresh token is invalid or revoked, clear stored tokens to force re-authentication
                if (errorType === 'invalid_grant' || errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('revoked')) {
                    await this.clearAuthentication();
                }
                
                throw new Error(`Failed to refresh token: ${errorMsg}`);
            }
            throw error;
        }
    }

    /**
     * Get authorization code from Google OAuth
     */
    private async getAuthorizationCode(codeChallenge: string): Promise<string> {
        const state = this.generateRandomState();
        const authUrl = await this.buildAuthUrl(state, codeChallenge);

        return new Promise((resolve, reject) => {
            let timeoutId: NodeJS.Timeout | null = null;
            let serverClosed = false;

            const closeServer = () => {
                if (!serverClosed) {
                    serverClosed = true;
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    server.close();
                }
            };

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
                        closeServer();
                        reject(new Error(`OAuth error: ${error}`));
                        return;
                    }

                    if (returnedState !== state) {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Authentication Failed</h1><p>Invalid state parameter.</p></body></html>');
                        closeServer();
                        reject(new Error('Invalid state parameter'));
                        return;
                    }

                    if (code) {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Authentication Successful!</h1><p>You can close this window and return to VS Code.</p></body></html>');
                        closeServer();
                        resolve(code);
                    } else {
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Authentication Failed</h1><p>No authorization code received.</p></body></html>');
                        closeServer();
                        reject(new Error('No authorization code received'));
                    }
                } else {
                    // Handle unknown paths - return 404 to close connection properly
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h1>Not Found</h1></body></html>');
                }
            });

            // Handle server errors (e.g., port already in use)
            server.on('error', (err) => {
                closeServer();
                reject(new Error(`Failed to start OAuth callback server: ${err.message}`));
            });

            server.listen(54321, () => {
                vscode.env.openExternal(vscode.Uri.parse(authUrl));
            });

            // Timeout after 5 minutes
            timeoutId = setTimeout(() => {
                closeServer();
                reject(new Error('Authentication timeout'));
            }, 300000);
        });
    }

    /**
     * Exchange authorization code for access token
     */
    private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
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
                grant_type: 'authorization_code',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                code_verifier: codeVerifier
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
     * Note: Google typically only returns a refresh_token on the initial authorization.
     * Subsequent token refreshes return only a new access_token, preserving the original refresh_token.
     * This method only updates the refresh_token if present in the response.
     */
    private async storeTokens(tokenResponse: TokenResponse): Promise<void> {
        await this.context.secrets.store(TOKEN_STORAGE_KEY, tokenResponse.access_token);
        
        // Only update refresh token if provided (typically only on initial auth)
        if (tokenResponse.refresh_token) {
            await this.context.secrets.store(REFRESH_TOKEN_STORAGE_KEY, tokenResponse.refresh_token);
        }

        const expiry = Date.now() + (tokenResponse.expires_in * 1000);
        await this.context.secrets.store(TOKEN_EXPIRY_KEY, expiry.toString());
    }

    /**
     * Build Google OAuth authorization URL
     */
    private async buildAuthUrl(state: string, codeChallenge: string): Promise<string> {
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
            prompt: 'consent',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            code_challenge: codeChallenge,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            code_challenge_method: 'S256'
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    /**
     * Generate random state for CSRF protection
     */
    private generateRandomState(): string {
        // Generate cryptographically secure random state for CSRF protection
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Generate PKCE code verifier (random string)
     * Per RFC 7636, must be 43-128 characters from [A-Z][a-z][0-9]-._~
     */
    private generateCodeVerifier(): string {
        // Generate 32 random bytes and encode as base64url (43 characters)
        return crypto.randomBytes(32)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Generate PKCE code challenge from verifier
     * Uses S256 (SHA-256) method as required by Google
     */
    private async generateCodeChallenge(verifier: string): Promise<string> {
        // SHA-256 hash of the verifier, then base64url encode
        const hash = crypto.createHash('sha256').update(verifier).digest();
        return hash.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
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
