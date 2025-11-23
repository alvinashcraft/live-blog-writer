# OAuth Credentials Configuration

This document explains how to securely manage OAuth credentials for the Live Blog Writer extension without storing them in source control.

## Approach: Azure Key Vault + Build-Time Injection

Instead of hardcoding credentials in source files, we:

1. Store credentials in Azure Key Vault (or environment variables)
2. Retrieve them at build time
3. Inject them into the compiled JavaScript

This keeps credentials out of your Git repository while still embedding them in the distributed extension.

## Setup Instructions

### 1. Create OAuth Credentials

Follow the guide in `docs/GOOGLE_OAUTH_SETUP.md` to create OAuth credentials in Google Cloud Console. You'll get:

- Client ID
- Client Secret

### 2. Store in Azure Key Vault

```bash
# Login to Azure
az login

# Create Key Vault (if you don't have one)
az keyvault create --name "your-keyvault-name" --resource-group "your-rg" --location "eastus"

# Store the secrets
az keyvault secret set --vault-name "your-keyvault-name" --name "BloggerOAuthClientId" --value "your-client-id.apps.googleusercontent.com"
az keyvault secret set --vault-name "your-keyvault-name" --name "BloggerOAuthClientSecret" --value "GOCSPX-your-secret"
```

### 3. Local Development

For local builds, you have two options:

**Option A: Use the PowerShell script**

```powershell
# Retrieve secrets from Key Vault and set environment variables
.\scripts\get-secrets-from-keyvault.ps1 -KeyVaultName "your-keyvault-name"

# Then build
npm run package
```

**Option B: Use a .env file** (not committed to Git)

```bash
# Copy the example
cp .env.example .env

# Edit .env and add your credentials
BLOGGER_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
BLOGGER_OAUTH_CLIENT_SECRET=GOCSPX-your-secret

# Set environment variables from .env manually or use a tool
# PowerShell:
Get-Content .env | ForEach-Object { if($_ -match '^([^=]+)=(.*)$') { [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process") } }

# Then build
npm run package
```

## Security Notes

- **Client Secret in Desktop Apps**: For desktop/VS Code extensions, the client secret cannot be truly "secret" as it's embedded in the code. This is expected and acceptable for OAuth in desktop applications.
- **Google's Perspective**: Google understands this limitation and allows it for non-web applications.
- **User Authentication**: Each user still needs to authenticate and grant permissions - the embedded credentials just allow them to do so without creating their own Google Cloud project.
- **Advanced Users**: Users who want to use their own credentials can still override these defaults using the "Set Custom Blogger Credentials" command.

### 4. CI/CD Pipeline (GitHub Actions / Azure DevOps)

**For GitHub Actions:**

```yaml
# .github/workflows/build.yml
- name: Get secrets from Azure Key Vault
  uses: Azure/get-keyvault-secrets@v1
  with:
    keyvault: "your-keyvault-name"
    secrets: 'BloggerOAuthClientId, BloggerOAuthClientSecret'

- name: Set environment variables
  run: |
    echo "BLOGGER_OAUTH_CLIENT_ID=${{ steps.get-secrets.outputs.BloggerOAuthClientId }}" >> $GITHUB_ENV
    echo "BLOGGER_OAUTH_CLIENT_SECRET=${{ steps.get-secrets.outputs.BloggerOAuthClientSecret }}" >> $GITHUB_ENV

- name: Build and package
  run: npm run package
```

**For Azure DevOps:**

```yaml
# azure-pipelines.yml
- task: AzureKeyVault@2
  inputs:
    azureSubscription: 'your-service-connection'
    KeyVaultName: 'your-keyvault-name'
    SecretsFilter: 'BloggerOAuthClientId,BloggerOAuthClientSecret'
    RunAsPreJob: true

- script: npm run package
  env:
    BLOGGER_OAUTH_CLIENT_ID: $(BloggerOAuthClientId)
    BLOGGER_OAUTH_CLIENT_SECRET: $(BloggerOAuthClientSecret)
  displayName: 'Build and package extension'
```

## How It Works

1. **Source Code**: Contains placeholder values (`YOUR_CLIENT_ID_HERE`)
2. **Build Time**: Script reads environment variables and injects real values into compiled `.js` files
3. **Distribution**: The packaged `.vsix` file contains real credentials
4. **Runtime**: Extension uses embedded credentials for all users

## Security Best Practices

- **Client Secret in Desktop Apps**: For desktop/VS Code extensions, the client secret cannot be truly "secret" as it's embedded in the code. This is expected and acceptable for OAuth in desktop applications.
- **Source Control**: Credentials never appear in Git history
- **Key Vault Access**: Limit who can access your Key Vault
- **Rotation**: If credentials are compromised, regenerate in Google Cloud Console and update Key Vault

## Verification

After building, verify the credentials were injected:

```bash
# Check the compiled file (don't commit this!)
cat out/services/GoogleOAuthService.js | grep DEFAULT_CLIENT_ID
# Should show your actual client ID, not 'YOUR_CLIENT_ID_HERE'
```

## For End Users

Users of your extension don't need to do anything - the credentials are embedded. They just:

1. Configure their Blogger Blog ID in settings
2. Run "Authenticate with Blogger" command
3. Sign in and grant permissions

That's it! Much simpler than requiring each user to create their own OAuth credentials.

## Troubleshooting

### Build fails with "YOUR_CLIENT_ID_HERE" still present

**Cause**: Environment variables not set during build.

**Solutions**:

- Verify environment variables are set: `echo $env:BLOGGER_OAUTH_CLIENT_ID` (PowerShell) or `echo %BLOGGER_OAUTH_CLIENT_ID%` (CMD)
- Run the PowerShell script: `.\scripts\get-secrets-from-keyvault.ps1`
- Check Key Vault access: `az keyvault secret show --vault-name your-keyvault-name --name BloggerOAuthClientId`

### Azure CLI authentication fails

**Cause**: Not logged into Azure or insufficient permissions.

**Solutions**:

```bash
# Login to Azure
az login

# Set subscription if you have multiple
az account set --subscription "your-subscription-id"

# Verify Key Vault access
az keyvault show --name your-keyvault-name
```

### Credentials work locally but fail in CI/CD

**Cause**: Service principal or managed identity lacks Key Vault permissions.

**Solutions**:

- Grant Key Vault access to service principal/managed identity:

```bash
az keyvault set-policy --name your-keyvault-name \
  --spn <service-principal-id> \
  --secret-permissions get list
```

- For GitHub Actions, use Azure Login action with service principal credentials
- For Azure DevOps, configure service connection with Key Vault access

### Users see "invalid_client" error

**Cause**: Credentials not properly injected, or OAuth app not configured correctly.

**Solutions**:

- Verify credentials in compiled file: `cat out/services/GoogleOAuthService.js | grep DEFAULT_CLIENT_ID`
- Check Google Cloud Console: Ensure redirect URI `http://localhost:54321/oauth2callback` is added
- Verify OAuth consent screen is configured

## Alternative Approaches

If Azure Key Vault doesn't fit your workflow:

### Option 1: GitHub Secrets (for GitHub-hosted projects)

```yaml
# .github/workflows/build.yml
- name: Build with credentials
  env:
    BLOGGER_OAUTH_CLIENT_ID: ${{ secrets.BLOGGER_OAUTH_CLIENT_ID }}
    BLOGGER_OAUTH_CLIENT_SECRET: ${{ secrets.BLOGGER_OAUTH_CLIENT_SECRET }}
  run: npm run package
```

### Option 2: Google Secret Manager

```bash
# Install gcloud CLI
gcloud secrets create blogger-oauth-client-id --data-file=-
# Enter your client ID

# Retrieve in build
export BLOGGER_OAUTH_CLIENT_ID=$(gcloud secrets versions access latest --secret="blogger-oauth-client-id")
```

### Option 3: Environment Config Files (not recommended)

Keep a `.env` file locally (gitignored) and manually copy credentials for builds. Less secure and harder to manage in teams.
