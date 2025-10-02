# GitHub Actions Secret Sync Tool (API Version)

This tool securely syncs secrets from a local `.env.github` file to your GitHub repository's Actions secrets using the official GitHub REST API. This method is more robust than using the `gh` CLI and correctly handles multiline values.

## Setup

### 1. Create a Personal Access Token (PAT)

This script requires a GitHub PAT to authenticate with the API.

- Go to [https://github.com/settings/tokens](https://github.com/settings/tokens).
- Click **"Generate new token"**.
- Give it a descriptive name (e.g., `secret-sync-script`).
- Set an expiration date.
- Under **"Repository access"**, select "Only select repositories" and choose your `asset-archive` repository.
- Under **"Permissions"**, click "Repository permissions" and grant **"Secrets"** permission (Read and write).
- Click **"Generate token"** and copy the token immediately.

### 2. Setup Python Virtual Environment

Using a virtual environment is highly recommended to keep dependencies isolated. These commands should be run from within the `tools/github-env` directory.

```bash
# Step 1: Create the virtual environment (only needs to be done once)
python3 -m venv venv

# Step 2: Activate the virtual environment (needs to be done for each new terminal session)
source venv/bin/activate
```
You'll know it's active when you see `(venv)` at the beginning of your shell prompt.

### 3. Install Dependencies

With the virtual environment active, install the required packages.

```bash
# This will install the packages into your private 'venv' directory
pip3 install -r requirements.txt
```

### 4. Create Your Secrets File

Copy the `.env.github.example` file to a new file named `.env.github` in this same directory. Fill it out with your actual secrets.

```bash
cp .env.github.example .env.github
# Now edit .env.github with your values
```
**IMPORTANT:** This file contains your secrets. Ensure it is listed in your root `.gitignore` file.

## Usage

Make sure your virtual environment is active before running the script.

Run the script from the command line. You must provide your GitHub username, repository name, and the PAT you generated.

```bash
# Make sure you see (venv) in your prompt
python3 sync_secrets.py --owner <YOUR_GITHUB_USERNAME> --repo <YOUR_REPO_NAME> --pat <YOUR_PERSONAL_ACCESS_TOKEN>
```

Example:
```bash
python3 sync_secrets.py --owner davidb-onchain --repo asset-archive --pat ghp_xxxxxxxxxx
```

The script will then connect to the API, encrypt each secret from your `.env.github` file, and upload it to your repository's Actions secrets.

When you are finished, you can deactivate the virtual environment:
```bash
deactivate
``` 