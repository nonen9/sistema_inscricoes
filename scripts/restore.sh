#!/bin/bash

# Restore Script for Tournament System
# This script restores data from a backup archive
# Usage: ./restore.sh [backup-archive.tar.gz|latest]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DATA_DIR="/app/data"
CONFIG_DIR="/app/config"
BACKUP_BASE_DIR="/app/backups"
TEMP_RESTORE_DIR="/tmp/tournament_restore_$$"

# Function to restore from latest directory backup (old format)
restore_from_latest_directory() {
    echo -e "${BLUE}🔄 Looking for latest directory backup...${NC}"
    
    # Find the latest directory backup
    LATEST_BACKUP=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "20*" | sort | tail -1)

    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "${RED}❌ No directory backup found in $BACKUP_BASE_DIR${NC}"
        return 1
    fi

    echo -e "${YELLOW}� Latest backup found: $LATEST_BACKUP${NC}"

    # Restore data files
    if [ -d "$LATEST_BACKUP/data" ]; then
        echo -e "${YELLOW}🔄 Restoring data files...${NC}"
        mkdir -p "$DATA_DIR"
        cp -r "$LATEST_BACKUP/data"/* "$DATA_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✅ Data restored to: $DATA_DIR${NC}"
    fi

    # Restore config files
    if [ -d "$LATEST_BACKUP/config" ]; then
        echo -e "${YELLOW}🔄 Restoring config files...${NC}"
        mkdir -p "$CONFIG_DIR"
        cp -r "$LATEST_BACKUP/config"/* "$CONFIG_DIR/" 2>/dev/null || true
        echo -e "${GREEN}✅ Config restored to: $CONFIG_DIR${NC}"
    fi

    return 0
}

# Function to restore from tar.gz archive
restore_from_archive() {
    local BACKUP_FILE="$1"
    
    echo -e "${BLUE}🔄 Starting restore from archive...${NC}"
    echo -e "${YELLOW}📁 Backup file: $BACKUP_FILE${NC}"

    # Create temporary restore directory
    mkdir -p "$TEMP_RESTORE_DIR"

    # Extract backup archive
    echo -e "${YELLOW}📦 Extracting backup archive...${NC}"
    tar -xzf "$BACKUP_FILE" -C "$TEMP_RESTORE_DIR"

    # Find the extracted directory
    EXTRACTED_DIR=$(find "$TEMP_RESTORE_DIR" -maxdepth 1 -type d ! -path "$TEMP_RESTORE_DIR" | head -n 1)

    if [ -z "$EXTRACTED_DIR" ]; then
        echo -e "${RED}❌ Error: Could not find extracted backup directory${NC}"
        rm -rf "$TEMP_RESTORE_DIR"
        return 1
    fi

    echo -e "${GREEN}✅ Backup extracted to: $EXTRACTED_DIR${NC}"

    # Display backup manifest if available
    if [ -f "$EXTRACTED_DIR/MANIFEST.txt" ]; then
        echo -e "${BLUE}📋 Backup Manifest:${NC}"
        cat "$EXTRACTED_DIR/MANIFEST.txt"
        echo ""
    fi

    # Restore data files
    if [ -d "$EXTRACTED_DIR/data" ]; then
        echo -e "${YELLOW}🔄 Restoring data files...${NC}"
        mkdir -p "$DATA_DIR"
        
        for file in "$EXTRACTED_DIR/data"/*; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                echo -e "${YELLOW}📦 Restoring data/$filename...${NC}"
                cp "$file" "$DATA_DIR/"
                echo -e "${GREEN}✅ data/$filename restored${NC}"
            fi
        done
    fi

    # Restore config files
    if [ -d "$EXTRACTED_DIR/config" ]; then
        echo -e "${YELLOW}🔄 Restoring config files...${NC}"
        mkdir -p "$CONFIG_DIR"
        
        for file in "$EXTRACTED_DIR/config"/*; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                echo -e "${YELLOW}📦 Restoring config/$filename...${NC}"
                cp "$file" "$CONFIG_DIR/"
                echo -e "${GREEN}✅ config/$filename restored${NC}"
            fi
        done
    fi

    # Clean up temporary directory
    rm -rf "$TEMP_RESTORE_DIR"
    return 0
}

# Main restore logic
if [ $# -eq 0 ] || [ "$1" = "latest" ]; then
    echo -e "${BLUE}🔄 Restoring from latest available backup...${NC}"
    
    # Try archive backups first
    LATEST_ARCHIVE=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -name "*.tar.gz" | sort | tail -1)
    
    if [ -n "$LATEST_ARCHIVE" ]; then
        echo -e "${YELLOW}📦 Found latest archive: $LATEST_ARCHIVE${NC}"
        restore_from_archive "$LATEST_ARCHIVE"
    else
        echo -e "${YELLOW}📁 No archive backups found, trying directory backups...${NC}"
        restore_from_latest_directory
    fi
else
    # Specific backup file provided
    BACKUP_FILE="$1"
    
    # Check if backup file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        # Try looking in backup directory
        if [ -f "$BACKUP_BASE_DIR/$BACKUP_FILE" ]; then
            BACKUP_FILE="$BACKUP_BASE_DIR/$BACKUP_FILE"
        else
            echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
            echo ""
            echo -e "${YELLOW}Available backups:${NC}"
            ls -la "$BACKUP_BASE_DIR"/*.tar.gz 2>/dev/null || echo "No archive backups found"
            find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "20*" | sort | tail -5 || echo "No directory backups found"
            exit 1
        fi
    fi
    
    restore_from_archive "$BACKUP_FILE"
fi

# Set proper permissions
echo -e "${YELLOW}� Setting file permissions...${NC}"
chmod -R 644 "$DATA_DIR"/*.json 2>/dev/null || true
chmod -R 644 "$CONFIG_DIR"/*.json 2>/dev/null || true

# List restored files
echo ""
echo -e "${BLUE}📋 Restored files:${NC}"
find "$DATA_DIR" "$CONFIG_DIR" -name "*.json" 2>/dev/null | while read file; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file" 2>/dev/null || echo "0")
        echo -e "${GREEN}  📄 $file ($lines lines)${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Restore completed successfully!${NC}"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "  1. Restart the application to load the restored data"
echo "  2. Verify that all data is correct"
echo ""
echo -e "${GREEN}✨ Restore process completed!${NC}"
