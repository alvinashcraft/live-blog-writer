/**
 * Build script to inject OAuth credentials from Azure Key Vault or environment variables
 * This keeps credentials out of source control while making them available at runtime
 */

const fs = require('fs');
const path = require('path');

// Get credentials from environment variables (set by CI/CD or locally)
const clientId = process.env.BLOGGER_OAUTH_CLIENT_ID;
const clientSecret = process.env.BLOGGER_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.error('ERROR: OAuth credentials not found in environment variables');
    console.error('Please set:');
    console.error('  - BLOGGER_OAUTH_CLIENT_ID');
    console.error('  - BLOGGER_OAUTH_CLIENT_SECRET');
    console.error('');
    console.error('For local development, create a .env file or set them manually');
    console.error('For CI/CD, configure them as pipeline secrets');
    process.exit(1);
}

// Path to the compiled JavaScript file (relative to project root, not scripts/)
const serviceFilePath = path.join(__dirname, '..', 'out', 'services', 'GoogleOAuthService.js');

if (!fs.existsSync(serviceFilePath)) {
    console.error('ERROR: GoogleOAuthService.js not found. Run `npm run compile` first.');
    console.error(`Looking for: ${serviceFilePath}`);
    process.exit(1);
}

// Read the compiled file
let content = fs.readFileSync(serviceFilePath, 'utf8');

// Replace the placeholder values
content = content.replace(
    /const DEFAULT_CLIENT_ID = ['"]YOUR_CLIENT_ID_HERE['"];/,
    `const DEFAULT_CLIENT_ID = '${clientId}';`
);

content = content.replace(
    /const DEFAULT_CLIENT_SECRET = ['"]YOUR_CLIENT_SECRET_HERE['"];/,
    `const DEFAULT_CLIENT_SECRET = '${clientSecret}';`
);

// Write back
fs.writeFileSync(serviceFilePath, content, 'utf8');

console.log('✓ OAuth credentials injected successfully');
console.log(`  Client ID: ${clientId.substring(0, 20)}...`);
console.log('  Client Secret: [REDACTED]');
