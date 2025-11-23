# OAuth Setup Checklist

Use this checklist to verify your OAuth credential management setup is complete.

## ✅ Initial Setup (One-Time)

### 1. Google Cloud Console Setup
- [ ] Created Google Cloud project
- [ ] Enabled Blogger API v3
- [ ] Created OAuth 2.0 Client ID (Desktop application)
- [ ] Added redirect URI: `http://localhost:54321/callback`
- [ ] Configured OAuth consent screen
- [ ] Downloaded client credentials (JSON)
- [ ] Noted Client ID and Client Secret

### 2. Azure Key Vault Setup
- [ ] Created Azure Key Vault (or have access to existing one)
- [ ] Stored Client ID as secret: `BloggerOAuthClientId`
- [ ] Stored Client Secret as secret: `BloggerOAuthClientSecret`
- [ ] Verified access with: `az keyvault secret show --vault-name <name> --name BloggerOAuthClientId`

### 3. Source Code Setup
- [ ] Verified `GoogleOAuthService.ts` has placeholders:
  - `DEFAULT_CLIENT_ID = 'YOUR_CLIENT_ID_HERE'`
  - `DEFAULT_CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE'`
- [ ] Verified `.gitignore` excludes `.env` files
- [ ] Created `.env.example` with template
- [ ] Scripts directory contains:
  - `inject-credentials.js`
  - `get-secrets-from-keyvault.ps1`
- [ ] Package.json scripts configured:
  - `vscode:prepublish` includes `inject-credentials`
  - `build` includes `inject-credentials`
  - `package` and `publish` use `build`

## ✅ Local Development Setup

Choose one method:

### Method A: PowerShell Script
- [ ] Logged into Azure CLI: `az login`
- [ ] Run: `.\scripts\get-secrets-from-keyvault.ps1`
- [ ] Environment variables set (verify with `echo $env:BLOGGER_OAUTH_CLIENT_ID`)
- [ ] Build succeeds: `npm run build`
- [ ] Verify injection: `cat out/services/GoogleOAuthService.js | Select-String "DEFAULT_CLIENT_ID"`

### Method B: .env File
- [ ] Created `.env` file (gitignored)
- [ ] Populated with credentials from Key Vault or JSON file
- [ ] Loaded into environment (see OAUTH_SETUP_QUICK_REFERENCE.md)
- [ ] Build succeeds: `npm run build`
- [ ] Verify injection: `cat out/services/GoogleOAuthService.js | Select-String "DEFAULT_CLIENT_ID"`

## ✅ CI/CD Setup (GitHub Actions)

- [ ] Created `.github/workflows/build.yml`
- [ ] Created Azure service principal: `az ad sp create-for-rbac --sdk-auth`
- [ ] Added GitHub secret: `AZURE_CREDENTIALS` (full JSON output)
- [ ] Added GitHub secret: `AZURE_KEYVAULT_NAME`
- [ ] Granted Key Vault access to service principal:
  ```bash
  az keyvault set-policy --name <vault> \
    --spn <sp-id> --secret-permissions get list
  ```
- [ ] Pushed workflow to GitHub
- [ ] Verified workflow runs successfully
- [ ] Downloaded artifact `.vsix` file
- [ ] Tested VSIX installation

## ✅ Verification Tests

### Local Build Test
- [ ] Run: `npm run build`
- [ ] No errors about missing environment variables
- [ ] Check: `cat out/services/GoogleOAuthService.js | Select-String "YOUR_CLIENT_ID_HERE"`
  - Should return NO matches (placeholders replaced)
- [ ] Check: `cat out/services/GoogleOAuthService.js | Select-String "DEFAULT_CLIENT_ID"`
  - Should show your actual client ID (partial)

### Extension Test
- [ ] Run: `npm run package` (creates `.vsix` file)
- [ ] Install in VS Code: Extensions → Install from VSIX
- [ ] Open Command Palette: "Authenticate with Blogger"
- [ ] Browser opens to Google OAuth page
- [ ] Sign in and grant permissions
- [ ] VS Code shows success message
- [ ] Create test blog post
- [ ] Publish successfully

### CI/CD Test (if using GitHub Actions)
- [ ] Push commit to trigger workflow
- [ ] Workflow completes without errors
- [ ] Download artifact from workflow run
- [ ] Install `.vsix` and test authentication
- [ ] Verify published post appears on Blogger

## ✅ Documentation

- [ ] `OAUTH_CREDENTIALS_SETUP.md` - Complete setup guide
- [ ] `OAUTH_SETUP_QUICK_REFERENCE.md` - Quick reference
- [ ] `.github/workflows/README.md` - CI/CD setup
- [ ] `README.md` - Links to OAuth docs
- [ ] `.env.example` - Template for local dev
- [ ] Source code comments explain credential flow

## ✅ Security Review

- [ ] `.env` file is in `.gitignore`
- [ ] No credentials in Git history: `git log -S "CLIENT_SECRET" -p`
- [ ] Source code has only placeholders
- [ ] Key Vault access limited to necessary users/service principals
- [ ] Service principal has minimal permissions (Key Vault secrets: get, list only)
- [ ] OAuth consent screen configured appropriately
- [ ] Redirect URI is localhost only (desktop app)

## 🎉 Complete!

If all checkboxes are checked, your OAuth setup is complete and secure:

- ✅ Credentials stored securely in Azure Key Vault
- ✅ Never committed to Git
- ✅ Injected at build time
- ✅ End users get working extension without setup
- ✅ CI/CD pipeline automated
- ✅ Documentation complete

## Next Steps

1. Test the complete workflow end-to-end
2. Distribute VSIX to users or publish to marketplace
3. Monitor for any authentication issues
4. Plan credential rotation strategy (update in Key Vault + rebuild)

## Troubleshooting

If any step fails, consult:
- [`OAUTH_CREDENTIALS_SETUP.md`](OAUTH_CREDENTIALS_SETUP.md) - Detailed troubleshooting section
- [`OAUTH_SETUP_QUICK_REFERENCE.md`](OAUTH_SETUP_QUICK_REFERENCE.md) - Common issues and fixes
- GitHub workflow logs - For CI/CD issues
