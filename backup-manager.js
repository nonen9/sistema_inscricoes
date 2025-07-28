const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class BackupManager {
    constructor() {
        this.backupDir = path.join(__dirname, '..', 'backups');
        this.dataDir = path.join(__dirname, '..', 'data');
        this.configDir = path.join(__dirname, '..', 'config');
    }

    async ensureBackupDirectory() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            console.error('❌ Erro ao criar diretório de backup:', error);
        }
    }

    async createBackup() {
        try {
            await this.ensureBackupDirectory();
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const currentBackupDir = path.join(this.backupDir, `backup_${timestamp}`);
            
            await fs.mkdir(currentBackupDir, { recursive: true });
            
            console.log('🔄 Iniciando backup automático...');
            
            // Backup dos arquivos de dados
            const dataFiles = ['tournaments.json', 'registrations.json', 'players.json', 'payment-status.json'];
            
            for (const file of dataFiles) {
                try {
                    const sourcePath = path.join(this.dataDir, file);
                    const backupPath = path.join(currentBackupDir, file);
                    
                    if (fsSync.existsSync(sourcePath)) {
                        await fs.copyFile(sourcePath, backupPath);
                        console.log(`✅ Backup criado: ${file}`);
                    }
                } catch (error) {
                    console.log(`⚠️  Arquivo não encontrado: ${file}`);
                }
            }
            
            // Backup do arquivo de usuários
            try {
                const userConfigPath = path.join(this.configDir, 'users.json');
                const userBackupPath = path.join(currentBackupDir, 'users.json');
                
                if (fsSync.existsSync(userConfigPath)) {
                    await fs.copyFile(userConfigPath, userBackupPath);
                    console.log('✅ Backup criado: users.json');
                }
            } catch (error) {
                console.log('⚠️  Arquivo users.json não encontrado');
            }
            
            // Manter apenas os 10 backups mais recentes
            await this.cleanOldBackups();
            
            console.log(`🎉 Backup completo salvo em: ${currentBackupDir}`);
            return currentBackupDir;
            
        } catch (error) {
            console.error('❌ Erro no backup automático:', error);
            return null;
        }
    }

    async cleanOldBackups() {
        try {
            const backups = await fs.readdir(this.backupDir);
            const backupDirs = backups
                .filter(dir => dir.startsWith('backup_'))
                .sort()
                .reverse(); // Mais recentes primeiro
            
            // Manter apenas os 10 mais recentes
            if (backupDirs.length > 10) {
                const oldBackups = backupDirs.slice(10);
                for (const oldBackup of oldBackups) {
                    const oldBackupPath = path.join(this.backupDir, oldBackup);
                    await fs.rmdir(oldBackupPath, { recursive: true });
                    console.log(`🗑️  Backup antigo removido: ${oldBackup}`);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao limpar backups antigos:', error);
        }
    }

    async restoreFromLatestBackup() {
        try {
            const backups = await fs.readdir(this.backupDir);
            const backupDirs = backups
                .filter(dir => dir.startsWith('backup_'))
                .sort()
                .reverse(); // Mais recente primeiro
            
            if (backupDirs.length === 0) {
                console.log('⚠️  Nenhum backup encontrado para restauração');
                return false;
            }
            
            const latestBackup = path.join(this.backupDir, backupDirs[0]);
            console.log(`🔄 Restaurando do backup: ${backupDirs[0]}`);
            
            // Restaurar arquivos de dados
            const dataFiles = ['tournaments.json', 'registrations.json', 'players.json', 'payment-status.json'];
            
            for (const file of dataFiles) {
                try {
                    const backupFile = path.join(latestBackup, file);
                    const targetFile = path.join(this.dataDir, file);
                    
                    if (fsSync.existsSync(backupFile)) {
                        await fs.copyFile(backupFile, targetFile);
                        console.log(`✅ Restaurado: ${file}`);
                    }
                } catch (error) {
                    console.log(`⚠️  Erro ao restaurar ${file}:`, error.message);
                }
            }
            
            // Restaurar arquivo de usuários
            try {
                const userBackupFile = path.join(latestBackup, 'users.json');
                const userTargetFile = path.join(this.configDir, 'users.json');
                
                if (fsSync.existsSync(userBackupFile)) {
                    await fs.copyFile(userBackupFile, userTargetFile);
                    console.log('✅ Restaurado: users.json');
                }
            } catch (error) {
                console.log('⚠️  Erro ao restaurar users.json:', error.message);
            }
            
            console.log('🎉 Restauração concluída!');
            return true;
            
        } catch (error) {
            console.error('❌ Erro na restauração:', error);
            return false;
        }
    }

    // Backup agendado (diário)
    startScheduledBackups() {
        // Backup inicial
        this.createBackup();
        
        // Backup a cada 24 horas
        setInterval(() => {
            this.createBackup();
        }, 24 * 60 * 60 * 1000); // 24 horas
        
        console.log('⏰ Backup automático agendado para cada 24 horas');
    }
}

module.exports = BackupManager;
