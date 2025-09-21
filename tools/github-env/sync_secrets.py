import os
import sys
import argparse
import base64
import requests
from nacl import encoding, public

def get_repo_public_key(owner, repo, pat):
    """Fetch the repository's public key for encrypting secrets."""
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/public-key"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {pat}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    data = response.json()
    return data["key"], data["key_id"]

def encrypt_secret(public_key_b64, secret_value):
    """Encrypt a secret value using the repository's public key."""
    public_key = public.PublicKey(public_key_b64.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")

def set_repo_secret(owner, repo, pat, secret_name, encrypted_value, key_id):
    """Create or update a repository secret."""
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/{secret_name}"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {pat}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    data = {
        "encrypted_value": encrypted_value,
        "key_id": key_id,
    }
    response = requests.put(url, headers=headers, json=data)
    response.raise_for_status()
    return response.status_code

def main():
    parser = argparse.ArgumentParser(description="Sync secrets to GitHub Actions using the REST API.")
    parser.add_argument("--owner", required=True, help="The GitHub repository owner.")
    parser.add_argument("--repo", required=True, help="The GitHub repository name.")
    parser.add_argument("--pat", required=True, help="Your GitHub Personal Access Token.")
    args = parser.parse_args()

    env_file_path = os.path.join(os.path.dirname(__file__), ".env.github")

    if not os.path.exists(env_file_path):
        print(f"❌ Error: Secrets file not found at {env_file_path}", file=sys.stderr)
        sys.exit(1)

    print(f"🔐 Fetching public key for {args.owner}/{args.repo}...")
    try:
        public_key_b64, key_id = get_repo_public_key(args.owner, args.repo, args.pat)
        print("✅ Public key fetched successfully.")
    except requests.exceptions.HTTPError as e:
        print(f"❌ Error fetching public key: {e.response.status_code} {e.response.text}", file=sys.stderr)
        sys.exit(1)

    print(f"🔄 Starting secret sync from '{env_file_path}'...")
    with open(env_file_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            if "=" not in line:
                print(f"⚠️  Skipping malformed line: {line}")
                continue
                
            key, value = line.split("=", 1)
            key = key.strip()
            
            # Simple logic to remove surrounding quotes if they exist
            if (value.startswith('"') and value.endswith('"')) or \
               (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]

            print(f"   Encrypting and setting secret for '{key}'...")
            try:
                encrypted_value = encrypt_secret(public_key_b64, value)
                status = set_repo_secret(args.owner, args.repo, args.pat, key, encrypted_value, key_id)
                if status in [201, 204]:
                    print(f"   ✅ Secret '{key}' has been set successfully (Status: {status}).")
            except Exception as e:
                print(f"   ❌ Failed to set secret '{key}': {e}", file=sys.stderr)

    print("\n🚀 All secrets have been synced successfully!")

if __name__ == "__main__":
    main() 