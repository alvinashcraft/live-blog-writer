# GitHub Actions Setup

This workflow builds and packages the VS Code extension with embedded OAuth credentials from Azure Key Vault.

## Required GitHub Secrets

Configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

### 1. AZURE_CREDENTIALS

Service principal credentials for Azure authentication. Create a service principal:

```bash
az ad sp create-for-rbac --name "github-actions-live-blog-writer" \
  --role reader \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
  --sdk-auth
```

Copy the entire JSON output and add as `AZURE_CREDENTIALS` secret.

### 2. AZURE_KEYVAULT_NAME

The name of your Azure Key Vault (e.g., `live-blog-writer-kv`).

Add as `AZURE_KEYVAULT_NAME` secret.

## Grant Key Vault Access

The service principal needs permission to read secrets:

```bash
# Get the service principal's object ID
SP_OBJECT_ID=$(az ad sp list --display-name "github-actions-live-blog-writer" --query "[0].id" -o tsv)

# Grant Key Vault access
az keyvault set-policy --name your-keyvault-name \
  --object-id $SP_OBJECT_ID \
  --secret-permissions get list
```

## Workflow Triggers

The workflow runs on:

- **Push to main**: Automatically builds when code is merged
- **Pull requests**: Builds PRs to verify they compile correctly
- **Manual dispatch**: Run manually from Actions tab

## Artifacts

The built `.vsix` file is uploaded as an artifact and retained for 30 days. Download from the workflow run page.

## Local Development

For local builds without GitHub Actions, see the main [`OAUTH_CREDENTIALS_SETUP.md`](../../docs/OAUTH_CREDENTIALS_SETUP.md) file for instructions on using the PowerShell script or `.env` file.
