#!/bin/bash

# Safe Deploy Script for Tournament System
# This script helps safely deploy updates while preserving data
# Usage: ./safe-deploy.sh [pre|post|docker]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
RESTORE_SCRIPT="$SCRIPT_DIR/restore.sh"

# Function to show usage
show_usage() {
    echo -e "${BLUE}🚀 Safe Deploy Script for Tournament System${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  pre     - Run before deployment (creates backup)"
    echo "  post    - Run after deployment (offers to restore if needed)"
    echo "  docker  - Full Docker deployment with backup/restore"
    echo "  status  - Show system status"
    echo "  help    - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 pre      # Create backup before EasyPanel deploy"
    echo "  $0 post     # Check and restore data after deploy"
    echo "  $0 docker   # Full local Docker deployment"
    echo ""
}

# Function to create pre-deployment backup
pre_deploy() {
    echo -e "${PURPLE}🚀 PRE-DEPLOYMENT BACKUP${NC}"
    echo -e "${YELLOW}════════════════════════${NC}"
    echo ""
    
    # Check if backup script exists
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        echo -e "${RED}❌ Error: Backup script not found at $BACKUP_SCRIPT${NC}"
        exit 1
    fi
    
    # Create pre-deploy backup with special naming
    BACKUP_NAME="pre-deploy-$(date +%Y%m%d_%H%M%S)"
    echo -e "${BLUE}📦 Creating pre-deployment backup: $BACKUP_NAME${NC}"
    
    # Run backup script
    bash "$BACKUP_SCRIPT" "$BACKUP_NAME"
    
    echo ""
    echo -e "${GREEN}✅ Pre-deployment backup completed!${NC}"
    echo -e "${YELLOW}💡 Backup name: $BACKUP_NAME${NC}"
    echo ""
    echo -e "${PURPLE}� NEXT STEPS:${NC}"
    echo "1. Now you can safely deploy via EasyPanel"
    echo "2. After deployment, run: $0 post"
    echo "3. The post-deploy script will help restore data if needed"
    echo ""
}

# Function to handle post-deployment
post_deploy() {
    echo -e "${PURPLE}🔄 POST-DEPLOYMENT CHECK${NC}"
    echo -e "${YELLOW}══════════════════════${NC}"
    echo ""
    
    # Check if restore script exists
    if [ ! -f "$RESTORE_SCRIPT" ]; then
        echo -e "${RED}❌ Error: Restore script not found at $RESTORE_SCRIPT${NC}"
        exit 1
    fi
    
    # Check if data files exist
    DATA_DIR="/app/data"
    CONFIG_DIR="/app/config"
    
    echo -e "${BLUE}🔍 Checking for data files...${NC}"
    
    MISSING_FILES=()
    EXPECTED_FILES=(
        "$DATA_DIR/tournaments.json"
        "$DATA_DIR/registrations.json"
        "$DATA_DIR/players.json"
        "$DATA_DIR/payment-status.json"
        "$CONFIG_DIR/users.json"
    )
    
    for file in "${EXPECTED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            MISSING_FILES+=("$file")
            echo -e "${RED}❌ Missing: $file${NC}"
        else
            lines=$(wc -l < "$file" 2>/dev/null || echo "0")
            size=$(stat -c%s "$file" 2>/dev/null || echo "0")
            echo -e "${GREEN}✅ Found: $file ($lines lines, $size bytes)${NC}"
        fi
    done
    
    echo ""
    
    if [ ${#MISSING_FILES[@]} -eq 0 ]; then
        echo -e "${GREEN}🎉 All data files found! Deployment appears successful.${NC}"
        echo ""
        echo -e "${BLUE}📊 Data Summary:${NC}"
        for file in "${EXPECTED_FILES[@]}"; do
            if [ -f "$file" ]; then
                lines=$(wc -l < "$file" 2>/dev/null || echo "0")
                echo "  $(basename "$file"): $lines lines"
            fi
        done
        echo ""
        echo -e "${YELLOW}� If you notice any data issues, you can restore from backup:${NC}"
        echo "   bash $RESTORE_SCRIPT latest"
    else
        echo -e "${RED}⚠️  WARNING: Missing data files detected!${NC}"
        echo ""
        echo "Missing files:"
        for file in "${MISSING_FILES[@]}"; do
            echo "  - $file"
        done
        echo ""
        echo -e "${YELLOW}🔄 Would you like to restore from the latest backup?${NC}"
        read -p "Restore data? (y/N): " restore_confirm
        
        if [[ "$restore_confirm" =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${BLUE}🔄 Restoring data from latest backup...${NC}"
            bash "$RESTORE_SCRIPT" latest
        else
            echo -e "${YELLOW}❌ Restore skipped. You can manually restore later with:${NC}"
            echo "   bash $RESTORE_SCRIPT latest"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}✅ Post-deployment check completed!${NC}"
}

# Function for full Docker deployment
docker_deploy() {
    echo -e "${PURPLE}🚀 DOCKER DEPLOYMENT WITH BACKUP/RESTORE${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo ""
    
    # 1. Backup dos dados atuais
    echo -e "${BLUE}📦 Step 1: Backup current data${NC}"
    if [ -f "$BACKUP_SCRIPT" ]; then
        chmod +x "$BACKUP_SCRIPT"
        bash "$BACKUP_SCRIPT" "docker-deploy-$(date +%Y%m%d_%H%M%S)"
    else
        echo -e "${YELLOW}⚠️  Backup script not found, creating manual backup...${NC}"
        BACKUP_DIR="./manual_backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        [ -d "./data" ] && cp -r ./data "$BACKUP_DIR/"
        [ -d "./config" ] && cp -r ./config "$BACKUP_DIR/"
        echo -e "${GREEN}✅ Manual backup created in: $BACKUP_DIR${NC}"
    fi

    # 2. Stop existing containers
    echo -e "${BLUE}🛑 Step 2: Stopping existing containers${NC}"
    docker-compose down

    # 3. Update code if needed
    echo -e "${BLUE}🔄 Step 3: Updating code${NC}"
    if [ -d ".git" ]; then
        git pull origin main || git pull origin master || echo -e "${YELLOW}⚠️  Git pull failed, continuing...${NC}"
    fi

    # 4. Rebuild application
    echo -e "${BLUE}🔨 Step 4: Rebuilding application${NC}"
    docker-compose build

    # 5. Start containers
    echo -e "${BLUE}▶️  Step 5: Starting containers${NC}"
    docker-compose up -d

    # 6. Wait for initialization
    echo -e "${BLUE}⏳ Step 6: Waiting for initialization...${NC}"
    sleep 10

    # 7. Check health
    echo -e "${BLUE}💚 Step 7: Checking application health${NC}"
    for i in {1..30}; do
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Application is healthy!${NC}"
            break
        fi
        echo -e "${YELLOW}⏳ Attempt $i/30 - waiting for application...${NC}"
        sleep 2
        
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Application failed to start properly${NC}"
            exit 1
        fi
    done

    # 8. Restore data if necessary
    echo -e "${BLUE}🔄 Step 8: Checking if data restore is needed${NC}"
    if [ -f "$RESTORE_SCRIPT" ]; then
        chmod +x "$RESTORE_SCRIPT"
        bash "$RESTORE_SCRIPT" latest
    fi

    echo ""
    echo -e "${GREEN}🎉 Docker deployment completed successfully!${NC}"
    echo -e "${BLUE}📊 Access: http://localhost:3000/admin${NC}"
    echo -e "${BLUE}📋 Logs: docker-compose logs -f${NC}"
}

# Function to show system status
show_status() {
    echo -e "${PURPLE}📊 SYSTEM STATUS${NC}"
    echo -e "${YELLOW}═══════════════${NC}"
    echo ""
    
    DATA_DIR="/app/data"
    CONFIG_DIR="/app/config"
    BACKUP_DIR="/app/backups"
    
    # For local development, try local paths too
    if [ ! -d "$DATA_DIR" ]; then
        DATA_DIR="./data"
        CONFIG_DIR="./config"
        BACKUP_DIR="./backups"
    fi
    
    # Check data files
    echo -e "${BLUE}📁 Data Files:${NC}"
    if [ -d "$DATA_DIR" ]; then
        for file in "$DATA_DIR"/*.json; do
            if [ -f "$file" ]; then
                lines=$(wc -l < "$file" 2>/dev/null || echo "0")
                size=$(stat -c%s "$file" 2>/dev/null || echo "0")
                echo "  ✅ $(basename "$file"): $lines lines, $size bytes"
            fi
        done
    else
        echo "  ❌ Data directory not found: $DATA_DIR"
    fi
    
    echo ""
    echo -e "${BLUE}🔧 Config Files:${NC}"
    if [ -d "$CONFIG_DIR" ]; then
        for file in "$CONFIG_DIR"/*.json; do
            if [ -f "$file" ]; then
                lines=$(wc -l < "$file" 2>/dev/null || echo "0")
                size=$(stat -c%s "$file" 2>/dev/null || echo "0")
                echo "  ✅ $(basename "$file"): $lines lines, $size bytes"
            fi
        done
    else
        echo "  ❌ Config directory not found: $CONFIG_DIR"
    fi
    
    echo ""
    echo -e "${BLUE}💾 Available Backups:${NC}"
    
    if [ -d "$BACKUP_DIR" ]; then
        # Archive backups
        archive_count=$(find "$BACKUP_DIR" -maxdepth 1 -name "*.tar.gz" 2>/dev/null | wc -l)
        if [ "$archive_count" -gt 0 ]; then
            echo "  � Archive backups: $archive_count"
            find "$BACKUP_DIR" -maxdepth 1 -name "*.tar.gz" | sort | tail -3 | while read backup; do
                size=$(stat -c%s "$backup" 2>/dev/null || echo "0")
                echo "    - $(basename "$backup") ($size bytes)"
            done
        fi
        
        # Directory backups
        dir_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" 2>/dev/null | wc -l)
        if [ "$dir_count" -gt 0 ]; then
            echo "  � Directory backups: $dir_count"
            find "$BACKUP_DIR" -maxdepth 1 -type d -name "20*" | sort | tail -3 | while read backup; do
                echo "    - $(basename "$backup")"
            done
        fi
        
        if [ "$archive_count" -eq 0 ] && [ "$dir_count" -eq 0 ]; then
            echo "  ❌ No backups found in $BACKUP_DIR"
        fi
    else
        echo "  ❌ Backup directory not found: $BACKUP_DIR"
    fi
}

# Main script logic
case "${1:-help}" in
    "pre")
        pre_deploy
        ;;
    "post")
        post_deploy
        ;;
    "docker")
        docker_deploy
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        show_usage
        ;;
esac
