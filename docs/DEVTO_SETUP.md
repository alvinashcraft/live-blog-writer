# Dev.to Setup

This guide explains how to configure Dev.to publishing in Live Blog Writer.

## Requirements

- A Dev.to account
- A Dev.to API key

## Create a Dev.to API key

1. Sign in to Dev.to
1. Go to **Settings → Account → DEV API Keys**
1. Create a new API key and copy it

## Add a Dev.to account in Blog Connections

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
1. Run **Live Blog Writer: Manage Blog Connections**
1. Click **+ Add Blog**
1. Choose **Dev.to** as the platform
1. Enter a friendly **Blog Name** (for example, `Dev.to - Personal`)
1. Optionally enter your Dev.to username (used for display)
1. Paste your Dev.to API key when prompted, or set it later

## Store the API key securely

You can store or update the API key at any time:

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
1. Run **Live Blog Writer: Set Dev.to API Key**
1. Choose the Dev.to account you configured
1. Paste your API key

The key is stored using VS Code Secrets, the same way other platform credentials are stored.

## Publishing to Dev.to

Dev.to expects Markdown content.

1. In the Blog Editor, set **Content format** to **Markdown**
1. Select your Dev.to blog in the **Selected Blog** dropdown
1. Click **Publish Post**

### Tag handling

Dev.to supports up to 4 tags per article.

- Live Blog Writer combines **Tags** and **Categories** and then keeps the first 4 unique values

## Current limitations

- Updating existing Dev.to articles is not implemented yet (create-only).
