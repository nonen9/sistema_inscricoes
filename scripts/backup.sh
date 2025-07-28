#!/bin/bash

# Backup Script for Tournament System
# This script creates a manual backup of all data files
# Usage: ./backup.sh [backup-name]

set -e  # Exit on any error

# Configuration
DATA_DIR="/app/data"
CONFIG_DIR="/app/config"
BACKUP_BASE_DIR="/app/backups"
DATE_FORMAT=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_NAME="${1:-manual_$DATE_FORMAT}"
BACKUP_DIR="$BACKUP_BASE_DIR/$BACKUP_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Iniciando backup manual do sistema...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# List of data files to backup
DATA_FILES=(
    "tournaments.json"
    "registrations.json" 
    "players.json"
    "payment-status.json"
)

CONFIG_FILES=(
    "users.json"
)

# Create backup manifest
echo "# Backup Manifest" > "$BACKUP_DIR/MANIFEST.txt"
echo "Created: $(date)" >> "$BACKUP_DIR/MANIFEST.txt"
echo "System: Tournament Registration System" >> "$BACKUP_DIR/MANIFEST.txt"
echo "Backup Name: $BACKUP_NAME" >> "$BACKUP_DIR/MANIFEST.txt"
echo "Files:" >> "$BACKUP_DIR/MANIFEST.txt"

# Backup data files
echo -e "${YELLOW}📦 Backing up data files...${NC}"
mkdir -p "$BACKUP_DIR/data"
for file in "${DATA_FILES[@]}"; do
    if [ -f "$DATA_DIR/$file" ]; then
        echo -e "${YELLOW}📦 Backing up data/$file...${NC}"
        cp "$DATA_DIR/$file" "$BACKUP_DIR/data/"
        
        # Add to manifest
        file_size=$(stat -c%s "$DATA_DIR/$file" 2>/dev/null || echo "0")
        line_count=$(wc -l < "$DATA_DIR/$file" 2>/dev/null || echo "0")
        echo "  - data/$file ($file_size bytes, $line_count lines)" >> "$BACKUP_DIR/MANIFEST.txt"
        
        echo -e "${GREEN}✅ data/$file backed up successfully${NC}"
    else
        echo -e "${RED}⚠️  Warning: data/$file not found, skipping...${NC}"
        echo "  - data/$file (NOT FOUND)" >> "$BACKUP_DIR/MANIFEST.txt"
    fi
done

# Backup config files
echo -e "${YELLOW}📦 Backing up config files...${NC}"
mkdir -p "$BACKUP_DIR/config"
for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$CONFIG_DIR/$file" ]; then
        echo -e "${YELLOW}📦 Backing up config/$file...${NC}"
        cp "$CONFIG_DIR/$file" "$BACKUP_DIR/config/"
        
        # Add to manifest
        file_size=$(stat -c%s "$CONFIG_DIR/$file" 2>/dev/null || echo "0")
        line_count=$(wc -l < "$CONFIG_DIR/$file" 2>/dev/null || echo "0")
        echo "  - config/$file ($file_size bytes, $line_count lines)" >> "$BACKUP_DIR/MANIFEST.txt"
        
        echo -e "${GREEN}✅ config/$file backed up successfully${NC}"
    else
        echo -e "${RED}⚠️  Warning: config/$file not found, skipping...${NC}"
        echo "  - config/$file (NOT FOUND)" >> "$BACKUP_DIR/MANIFEST.txt"
    fi
done

# Create compressed archive
echo -e "${YELLOW}🗜️  Creating compressed archive...${NC}"
cd "$BACKUP_BASE_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME/"

# Verify archive
if [ -f "${BACKUP_NAME}.tar.gz" ]; then
    archive_size=$(stat -c%s "${BACKUP_NAME}.tar.gz")
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo -e "${GREEN}📁 Location: $BACKUP_BASE_DIR/${BACKUP_NAME}.tar.gz${NC}"
    echo -e "${GREEN}📊 Size: $archive_size bytes${NC}"
    
    # Clean up uncompressed directory
    rm -rf "$BACKUP_NAME"
    
    echo ""
    echo -e "${YELLOW}📋 Backup Summary:${NC}"
    echo "  Name: $BACKUP_NAME"
    echo "  Archive: ${BACKUP_NAME}.tar.gz" 
    echo "  Size: $archive_size bytes"
    echo "  Data files: ${#DATA_FILES[@]}"
    echo "  Config files: ${#CONFIG_FILES[@]}"
    echo ""
    echo -e "${GREEN}🎉 Backup process completed successfully!${NC}"
else
    echo -e "${RED}❌ Error: Failed to create backup archive${NC}"
    exit 1
fi

# List recent backups
echo -e "${YELLOW}📜 Recent backups:${NC}"
ls -la "$BACKUP_BASE_DIR"/*.tar.gz 2>/dev/null | tail -5 || echo "No previous backups found"

echo ""
echo -e "${GREEN}💡 To restore this backup, run:${NC}"
echo -e "${YELLOW}   ./restore.sh ${BACKUP_NAME}.tar.gz${NC}"
