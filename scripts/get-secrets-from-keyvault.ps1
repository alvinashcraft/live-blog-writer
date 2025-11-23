# Retrieve secrets from Azure Key Vault and set as environment variables
# Usage: .\scripts\get-secrets-from-keyvault.ps1 -KeyVaultName "your-keyvault-name"

param(
    [Parameter(Mandatory=$true)]
    [string]$KeyVaultName
)

Write-Host "Retrieving secrets from Azure Key Vault: $KeyVaultName" -ForegroundColor Cyan

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "❌ Azure CLI not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "If you just installed Azure CLI, try one of these solutions:" -ForegroundColor Yellow
    Write-Host "  1. Close this terminal and open a new one" -ForegroundColor Cyan
    Write-Host "  2. Restart VS Code" -ForegroundColor Cyan
    Write-Host "  3. Manually add to PATH and reload: `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "If not installed yet, download from: https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    Write-Host "Default install location: C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Check if logged in
$account = az account show 2>$null
if (-not $account) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
}

Write-Host "Fetching secrets..." -ForegroundColor Cyan

# Get current account info
$currentAccount = az account show | ConvertFrom-Json
Write-Host "Current subscription: $($currentAccount.name) ($($currentAccount.id))" -ForegroundColor Gray
Write-Host "Tenant: $($currentAccount.tenantId)" -ForegroundColor Gray
Write-Host ""

# Retrieve secrets from Key Vault
try {
    Write-Host "Attempting to access Key Vault: $KeyVaultName" -ForegroundColor Gray
    $clientId = az keyvault secret show --name "BloggerOAuthClientId" --vault-name $KeyVaultName --query "value" -o tsv 2>&1
    
    # Check if there was an error
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Failed to access Key Vault" -ForegroundColor Red
        Write-Host ""
        
        if ($clientId -like "*AKV10032*" -or $clientId -like "*Invalid issuer*") {
            Write-Host "This error means you're logged into the wrong Azure tenant." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Solutions:" -ForegroundColor Cyan
            Write-Host "  1. Log out and log back in with the correct tenant:" -ForegroundColor White
            Write-Host "     az logout" -ForegroundColor Gray
            Write-Host "     az login --tenant YOUR_TENANT_ID" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  2. Or switch to the correct tenant:" -ForegroundColor White
            Write-Host "     az account set --subscription SUBSCRIPTION_ID" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  3. List all your available subscriptions:" -ForegroundColor White
            Write-Host "     az account list --output table" -ForegroundColor Gray
        } elseif ($clientId -like "*not found*") {
            Write-Host "The Key Vault '$KeyVaultName' was not found." -ForegroundColor Yellow
            Write-Host "Check the name and ensure it exists in your subscription." -ForegroundColor Yellow
        } elseif ($clientId -like "*Forbidden*" -or $clientId -like "*does not have secrets get permission*") {
            Write-Host "You don't have permission to read secrets from this Key Vault." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Ask your admin to grant access, or run:" -ForegroundColor White
            Write-Host "  az keyvault set-policy --name $KeyVaultName --upn YOUR_EMAIL@DOMAIN.COM --secret-permissions get list" -ForegroundColor Gray
        } else {
            Write-Host "Error details:" -ForegroundColor Yellow
            Write-Host $clientId -ForegroundColor Gray
        }
        Write-Host ""
        exit 1
    }
    
    $clientSecret = az keyvault secret show --name "BloggerOAuthClientSecret" --vault-name $KeyVaultName --query "value" -o tsv
    
    if (-not $clientId -or -not $clientSecret) {
        Write-Error "Failed to retrieve secrets from Key Vault"
        exit 1
    }
    
    # Set environment variables
    $env:BLOGGER_OAUTH_CLIENT_ID = $clientId
    $env:BLOGGER_OAUTH_CLIENT_SECRET = $clientSecret
    
    # Also export for the current session
    [System.Environment]::SetEnvironmentVariable("BLOGGER_OAUTH_CLIENT_ID", $clientId, "Process")
    [System.Environment]::SetEnvironmentVariable("BLOGGER_OAUTH_CLIENT_SECRET", $clientSecret, "Process")
    
    Write-Host "✓ Secrets retrieved and set as environment variables" -ForegroundColor Green
    Write-Host "  BLOGGER_OAUTH_CLIENT_ID: $($clientId.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "  BLOGGER_OAUTH_CLIENT_SECRET: [REDACTED]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You can now run: npm run package" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to retrieve secrets: $_"
    exit 1
}
