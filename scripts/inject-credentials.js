/**
 * Build script to inject OAuth credentials from Azure Key Vault or environment variables
 * This keeps credentials out of source control while making them available at runtime
 */

const fs = require('fs');
const path = require('path');

// Try to load .env file for local development
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not available or no .env file - that's okay for CI/CD
}

// Get credentials from environment variables (set by CI/CD or locally)
const clientId = process.env.BLOGGER_OAUTH_CLIENT_ID;
const clientSecret = process.env.BLOGGER_OAUTH_CLIENT_SECRET;

// Allow skipping credential injection in local development
const skipInjection = process.env.SKIP_CREDENTIAL_INJECTION === 'true';

if (!clientId || !clientSecret) {
    if (skipInjection) {
        console.log('⚠️  Skipping OAuth credential injection (SKIP_CREDENTIAL_INJECTION=true)');
        console.log('   The extension will use built-in credentials at runtime');
        process.exit(0);
    }
    
    console.error('ERROR: OAuth credentials not found in environment variables');
    console.error('Please set:');
    console.error('  - BLOGGER_OAUTH_CLIENT_ID');
    console.error('  - BLOGGER_OAUTH_CLIENT_SECRET');
    console.error('');
    console.error('Or set SKIP_CREDENTIAL_INJECTION=true to skip injection (for local dev)');
    console.error('For CI/CD, configure them as pipeline secrets');
    process.exit(1);
}

// Path to the bundled JavaScript file for production or compiled file for dev
const bundledFilePath = path.join(__dirname, '..', 'dist', 'extension.js');
const compiledFilePath = path.join(__dirname, '..', 'out', 'services', 'GoogleOAuthService.js');

// Prefer bundled file if it exists (production), otherwise use compiled (dev/test)
let serviceFilePath;
if (fs.existsSync(bundledFilePath)) {
    serviceFilePath = bundledFilePath;
    console.log('Injecting credentials into bundled file...');
} else if (fs.existsSync(compiledFilePath)) {
    serviceFilePath = compiledFilePath;
    console.log('Injecting credentials into compiled file...');
} else {
    console.error('ERROR: No compiled or bundled output found.');
    console.error('Run `npm run compile` or `webpack --mode production` first.');
    console.error(`Looking for: ${bundledFilePath} or ${compiledFilePath}`);
    process.exit(1);
}

// Read the compiled file
let content = fs.readFileSync(serviceFilePath, 'utf8');

// Helper function to escape special characters for string replacement
const escapeForReplacement = (str) => {
    return str.replace(/\$/g, '$$$$'); // Escape $ for replacement string
};

// Replace the placeholder values
content = content.replace(
    /const DEFAULT_CLIENT_ID = ['"]YOUR_CLIENT_ID_HERE['"];/,
    `const DEFAULT_CLIENT_ID = '${escapeForReplacement(clientId)}';`
);

content = content.replace(
    /const DEFAULT_CLIENT_SECRET = ['"]YOUR_CLIENT_SECRET_HERE['"];/,
    `const DEFAULT_CLIENT_SECRET = '${escapeForReplacement(clientSecret)}';`
);

// Write back
fs.writeFileSync(serviceFilePath, content, 'utf8');

console.log('✓ OAuth credentials injected successfully');
// Safely mask client ID based on actual length
const maskedClientId = clientId.length > 20 
    ? `${clientId.substring(0, 20)}...` 
    : `${clientId.substring(0, Math.min(clientId.length, 15))}...`;
console.log(`  Client ID: ${maskedClientId}`);
console.log('  Client Secret: [REDACTED]');
