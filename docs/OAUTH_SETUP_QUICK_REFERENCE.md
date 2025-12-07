# OAuth Credentials Setup - Quick Reference

This document provides a quick reference for setting up OAuth credentials for the Live Blog Writer extension.

## For End Users

**You don't need to do anything!** The extension includes built-in OAuth credentials. Just:

1. Configure your Blogger Blog ID in settings
2. Run "Authenticate with Blogger" command
3. Sign in and grant permissions

## For Developers - Local Development

### Option 1: PowerShell Script (Recommended)

```powershell
# Run this from the project root
.\scripts\get-secrets-from-keyvault.ps1
npm run build
```

### Option 2: Manual .env File

1. Copy `.env.example` to `.env`
1. Fill in your credentials:

   ```console
   BLOGGER_OAUTH_CLIENT_ID=your-client-id
   BLOGGER_OAUTH_CLIENT_SECRET=your-client-secret
   ```

1. Load environment variables (PowerShell):

   ```powershell
   Get-Content .env | ForEach-Object {
       if ($_ -match '^([^=]+)=(.*)$') {
           [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
       }
   }
   ```

1. Build:

   ```bash
   npm run build
   ```

## For Developers - CI/CD

### GitHub Actions

See `.github/workflows/build.yml` and `.github/workflows/README.md` for the complete setup.

**Required Secrets:**

- `AZURE_CREDENTIALS` - Service principal JSON
- `AZURE_KEYVAULT_NAME` - Your Key Vault name

### Azure DevOps

```yaml
- task: AzureKeyVault@2
  inputs:
    azureSubscription: 'your-service-connection'
    KeyVaultName: 'your-keyvault-name'
    SecretsFilter: 'BloggerOAuthClientId,BloggerOAuthClientSecret'

- script: npm run package
  env:
    BLOGGER_OAUTH_CLIENT_ID: $(BloggerOAuthClientId)
    BLOGGER_OAUTH_CLIENT_SECRET: $(BloggerOAuthClientSecret)
```

## Full Documentation

- **Complete Setup Guide**: [`OAUTH_CREDENTIALS_SETUP.md`](OAUTH_CREDENTIALS_SETUP.md)
- **GitHub Actions Setup**: [`../.github/workflows/README.md`](../.github/workflows/README.md)
- **User Guide**: [`GOOGLE_OAUTH_SETUP.md`](GOOGLE_OAUTH_SETUP.md)
- **Technical Details**: [`BLOGGER_OAUTH_SETUP.md`](BLOGGER_OAUTH_SETUP.md)

## Troubleshooting

### "YOUR_CLIENT_ID_HERE" in build

Environment variables not set. Run the PowerShell script or manually set them.

### Azure CLI login issues

```bash
az login
az account set --subscription "your-subscription-id"
```

### CI/CD authentication fails

Grant Key Vault access to service principal:

```bash
az keyvault set-policy --name your-keyvault-name \
  --spn <service-principal-id> \
  --secret-permissions get list
```

## Architecture Overview

```console
Source Code (Git)
    ↓
  [TypeScript with placeholders]
    ↓
  npm run compile
    ↓
  [JavaScript with placeholders in out/]
    ↓
  npm run inject-credentials
    ↓
  [Reads BLOGGER_OAUTH_CLIENT_ID/SECRET from env]
    ↓
  [Replaces placeholders in out/services/GoogleOAuthService.js]
    ↓
  vsce package
    ↓
  [VSIX file with embedded real credentials]
    ↓
  Distribute to users
```

**Key Points:**

- Credentials NEVER committed to Git
- Stored in Azure Key Vault
- Injected at build time only
- End users get working extension without setup
