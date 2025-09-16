#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
# Description: This script creates a compressed backup of a PostgreSQL database
# running inside a Docker container.
#
# Instructions:
# 1. Update the CONTAINER_NAME, DB_USER, and DB_NAME variables below.
# 2. Make the script executable: chmod +x backup.sh
# 3. Run it: ./backup.sh

# --- Variables to Configure ---
CONTAINER_NAME="assetarchive-postgres" # The name of your running Postgres container
DB_USER="strapi"                   # The username for the database
DB_NAME="strapi"                   # The name of the database to back up
BACKUP_DIR="../backups"                  # Directory to store the backups

# --- Script Logic (No need to edit below this line) ---
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/backup-${DB_NAME}-${TIMESTAMP}.dump"

echo "Starting PostgreSQL backup for container '${CONTAINER_NAME}'..."
echo "--------------------------------------------------"

# 1. Check if the container is running
if ! docker ps --filter "name=^/${CONTAINER_NAME}$" --format "{{.Names}}" | grep -q "${CONTAINER_NAME}"; then
    echo "❌ Error: Docker container '${CONTAINER_NAME}' is not running."
    exit 1
fi
echo "✔️ Container is running."

# 2. Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"
echo "✔️ Backup directory '${BACKUP_DIR}' is ready."

# 3. Execute pg_dump
# We use '-Fc' for a compressed, custom-format archive. It's generally
# more robust and efficient than a plain SQL file.
echo "Dumping database '${DB_NAME}'..."
docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc > "${BACKUP_FILE}"

# 4. Final confirmation
echo "✔️ Database dump complete."
echo ""
echo "✅ Backup successful!"
echo "   File created at: ${BACKUP_FILE}"
echo "--------------------------------------------------" 