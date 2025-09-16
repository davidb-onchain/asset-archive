#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
# Description: This script restores a PostgreSQL database from a backup file
# created by the backup.sh script.
#
# Instructions:
# 1. Update the CONTAINER_NAME, DB_USER, and DB_NAME variables below.
# 2. Make the script executable: chmod +x restore.sh
# 3. Run it, passing the path to the backup file as an argument:
#    ./restore.sh ../backups/backup-your-db-name-YYYY-MM-DD_HH-MM-SS.dump

# --- Variables to Configure ---
CONTAINER_NAME="assetarchive-postgres" # The name of your running Postgres container
DB_USER="strapi"                   # The username for the database
DB_NAME="strapi"                   # The database to restore into

# --- Script Logic (No need to edit below this line) ---

# 1. Check for backup file argument
if [ -z "$1" ]; then
    echo "❌ Error: No backup file specified."
    echo "Usage: $0 <path_to_backup_file.dump>"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Error: Backup file not found at '${BACKUP_FILE}'"
    exit 1
fi

echo "Starting PostgreSQL restore for container '${CONTAINER_NAME}'..."
echo "--------------------------------------------------"

# 2. Validate the backup file BEFORE any destructive actions
echo "Validating backup file integrity..."
if ! cat "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" pg_restore -l > /dev/null 2>&1; then
    echo "❌ FATAL ERROR: Backup file '${BACKUP_FILE}' is corrupted or invalid."
    echo "   Restore cannot proceed. Your database has NOT been touched."
    exit 1
fi
echo "✔️ Backup file appears valid."
echo "--------------------------------------------------"


# 3. Confirmation prompt
echo "🚨 WARNING: This is a destructive operation."
echo "   It will drop and recreate the database '${DB_NAME}' from the backup file."
read -p "   Are you sure you want to continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled by user."
    exit 0
fi
echo "--------------------------------------------------"


# 4. Terminate all active connections to the database
# This is necessary because we can't drop a database that has active sessions.
# We connect to the default 'postgres' database to execute this command.
echo "Terminating all connections to '${DB_NAME}'..."
docker exec -t "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${DB_NAME}' AND pid <> pg_backend_pid();"
echo "✔️ Connections terminated."


# 5. Drop and recreate the database to ensure a clean restore
echo "Dropping existing database '${DB_NAME}'..."
docker exec -t "${CONTAINER_NAME}" dropdb -U "${DB_USER}" --if-exists "${DB_NAME}"
echo "✔️ Database dropped."

echo "Creating new database '${DB_NAME}'..."
docker exec -t "${CONTAINER_NAME}" createdb -U "${DB_USER}" "${DB_NAME}"
echo "✔️ Database created."

# 6. Execute pg_restore
# We pipe the backup file into the container and use pg_restore.
echo "Restoring database from '${BACKUP_FILE}'..."
cat "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" pg_restore -U "${DB_USER}" -d "${DB_NAME}"
echo "✔️ Database restore command executed."

# 7. Final confirmation
echo ""
echo "✅ Restore complete!"
echo "--------------------------------------------------" 