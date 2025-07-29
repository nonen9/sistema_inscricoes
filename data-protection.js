/**
 * Data Protection System
 * Protege dados de produção e previne vazamento de dados de desenvolvimento
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

class DataProtection {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.dataPath = process.env.DATA_PATH || './data';
        this.configPath = process.env.CONFIG_PATH || './config';
        this.protectionFile = path.join(this.dataPath, '.environment-lock');
    }

    /**
     * Inicializa o sistema de proteção de dados
     */
    async initialize() {
        console.log('🔒 Inicializando sistema de proteção de dados...');
        console.log('🌍 Ambiente atual:', this.environment);
        
        // Garantir que diretórios existam
        await this.ensureDirectories();
        
        // Verificar proteção de ambiente
        await this.checkEnvironmentProtection();
        
        // Criar backup automático se em produção
        if (this.environment === 'production') {
            await this.createProductionBackup();
        }
        
        console.log('✅ Sistema de proteção de dados inicializado');
    }

    /**
     * Garante que os diretórios necessários existam
     */
    async ensureDirectories() {
        const directories = [this.dataPath, this.configPath];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`📁 Diretório garantido: ${dir}`);
            } catch (error) {
                console.error(`❌ Erro ao criar diretório ${dir}:`, error.message);
            }
        }
    }

    /**
     * Verifica e aplica proteção de ambiente
     */
    async checkEnvironmentProtection() {
        try {
            // Verificar se existe arquivo de lock
            let existingLock = null;
            try {
                const lockContent = await fs.readFile(this.protectionFile, 'utf8');
                existingLock = JSON.parse(lockContent);
            } catch (error) {
                // Arquivo não existe, será criado
            }

            const currentLock = {
                environment: this.environment,
                timestamp: new Date().toISOString(),
                protection: true,
                dataFingerprint: await this.generateDataFingerprint()
            };

            // Se ambiente mudou, aplicar proteções
            if (existingLock && existingLock.environment !== this.environment) {
                await this.handleEnvironmentChange(existingLock, currentLock);
            }

            // Salvar arquivo de lock atualizado
            await fs.writeFile(this.protectionFile, JSON.stringify(currentLock, null, 2));
            
            console.log('🔐 Proteção de ambiente aplicada:', this.environment);
            
        } catch (error) {
            console.error('❌ Erro na proteção de ambiente:', error.message);
        }
    }

    /**
     * Gera uma impressão digital dos dados para detectar mudanças
     */
    async generateDataFingerprint() {
        const files = [
            path.join(this.dataPath, 'tournaments.json'),
            path.join(this.dataPath, 'registrations.json'),
            path.join(this.dataPath, 'players.json'),
            path.join(this.configPath, 'users.json')
        ];

        let combinedContent = '';
        
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const data = JSON.parse(content);
                combinedContent += JSON.stringify(data).length.toString();
            } catch (error) {
                // Arquivo não existe, adicionar placeholder
                combinedContent += '0';
            }
        }

        return crypto.createHash('md5').update(combinedContent).digest('hex');
    }

    /**
     * Lida com mudanças de ambiente
     */
    async handleEnvironmentChange(oldLock, newLock) {
        console.log('⚠️  MUDANÇA DE AMBIENTE DETECTADA!');
        console.log(`📊 De: ${oldLock.environment} → Para: ${newLock.environment}`);
        
        if (oldLock.environment === 'production' && newLock.environment === 'development') {
            console.log('🚨 TENTATIVA DE MUDANÇA DE PRODUÇÃO PARA DESENVOLVIMENTO!');
            await this.protectProductionData();
        }
        
        if (oldLock.environment === 'development' && newLock.environment === 'production') {
            console.log('🚨 TENTATIVA DE ENVIO DE DADOS DE DESENVOLVIMENTO PARA PRODUÇÃO!');
            await this.preventDevelopmentDataLeak();
        }
    }

    /**
     * Protege dados de produção contra sobrescrita
     */
    async protectProductionData() {
        console.log('🛡️  Protegendo dados de produção...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.dataPath, 'production-backup-' + timestamp);
        
        try {
            await fs.mkdir(backupDir, { recursive: true });
            
            const files = [
                'tournaments.json',
                'registrations.json', 
                'players.json',
                'payment-status.json'
            ];
            
            for (const file of files) {
                const sourcePath = path.join(this.dataPath, file);
                const backupPath = path.join(backupDir, file);
                
                try {
                    await fs.copyFile(sourcePath, backupPath);
                    console.log(`💾 Backup criado: ${file}`);
                } catch (error) {
                    console.log(`ℹ️  Arquivo não existe: ${file}`);
                }
            }
            
            // Criar arquivo de proteção
            const protectionInfo = {
                message: 'DADOS DE PRODUÇÃO PROTEGIDOS',
                originalEnvironment: 'production',
                backupDate: new Date().toISOString(),
                warning: 'NÃO MODIFICAR OU EXCLUIR ESTES DADOS'
            };
            
            await fs.writeFile(
                path.join(backupDir, 'PROTECTION-INFO.json'), 
                JSON.stringify(protectionInfo, null, 2)
            );
            
            console.log('✅ Dados de produção protegidos em:', backupDir);
            
        } catch (error) {
            console.error('❌ Erro ao proteger dados de produção:', error.message);
        }
    }

    /**
     * Previne vazamento de dados de desenvolvimento para produção
     */
    async preventDevelopmentDataLeak() {
        console.log('🚫 Prevenindo vazamento de dados de desenvolvimento...');
        
        const files = [
            'tournaments.json',
            'registrations.json',
            'players.json'
        ];
        
        for (const file of files) {
            const filePath = path.join(this.dataPath, file);
            
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(content);
                
                if (data.length > 0) {
                    console.log(`⚠️  Arquivo ${file} contém ${data.length} registros de desenvolvimento`);
                    
                    // Criar backup dos dados de desenvolvimento
                    const devBackupPath = path.join(this.dataPath, `dev-backup-${file}`);
                    await fs.writeFile(devBackupPath, content);
                    
                    // Limpar arquivo para produção
                    await fs.writeFile(filePath, JSON.stringify([], null, 2));
                    console.log(`🧹 Arquivo ${file} limpo para produção`);
                }
            } catch (error) {
                // Arquivo não existe, criar vazio
                await fs.writeFile(filePath, JSON.stringify([], null, 2));
                console.log(`📝 Arquivo ${file} criado vazio para produção`);
            }
        }
        
        console.log('✅ Prevenção de vazamento concluída');
    }

    /**
     * Cria backup automático em produção
     */
    async createProductionBackup() {
        console.log('💾 Criando backup automático de produção...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.dataPath, 'auto-backup-' + timestamp);
        
        try {
            await fs.mkdir(backupDir, { recursive: true });
            
            const files = [
                'tournaments.json',
                'registrations.json',
                'players.json',
                'payment-status.json'
            ];
            
            for (const file of files) {
                const sourcePath = path.join(this.dataPath, file);
                const backupPath = path.join(backupDir, file);
                
                try {
                    await fs.copyFile(sourcePath, backupPath);
                } catch (error) {
                    // Arquivo não existe, criar vazio no backup
                    await fs.writeFile(backupPath, JSON.stringify([], null, 2));
                }
            }
            
            console.log('✅ Backup automático criado em:', backupDir);
            
        } catch (error) {
            console.error('❌ Erro ao criar backup automático:', error.message);
        }
    }

    /**
     * Limpa backups antigos (mantém últimos 10)
     */
    async cleanOldBackups() {
        try {
            const files = await fs.readdir(this.dataPath);
            const backupDirs = files.filter(file => 
                file.startsWith('auto-backup-') || file.startsWith('production-backup-')
            );
            
            if (backupDirs.length > 10) {
                // Ordenar por data (mais antigos primeiro)
                backupDirs.sort();
                
                // Remover os mais antigos
                const toRemove = backupDirs.slice(0, backupDirs.length - 10);
                
                for (const dir of toRemove) {
                    const dirPath = path.join(this.dataPath, dir);
                    await fs.rmdir(dirPath, { recursive: true });
                    console.log(`🗑️  Backup antigo removido: ${dir}`);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao limpar backups antigos:', error.message);
        }
    }

    /**
     * Verifica integridade dos dados
     */
    async verifyDataIntegrity() {
        console.log('🔍 Verificando integridade dos dados...');
        
        const files = [
            'tournaments.json',
            'registrations.json',
            'players.json'
        ];
        
        for (const file of files) {
            const filePath = path.join(this.dataPath, file);
            
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(content);
                
                if (!Array.isArray(data)) {
                    throw new Error(`Arquivo ${file} não contém um array válido`);
                }
                
                console.log(`✅ ${file}: ${data.length} registros válidos`);
                
            } catch (error) {
                console.error(`❌ Erro na integridade de ${file}:`, error.message);
                
                // Tentar recuperar de backup
                await this.recoverFromBackup(file);
            }
        }
    }

    /**
     * Recupera arquivo de backup em caso de corrupção
     */
    async recoverFromBackup(fileName) {
        console.log(`🔄 Tentando recuperar ${fileName} de backup...`);
        
        try {
            const files = await fs.readdir(this.dataPath);
            const backupDirs = files.filter(file => 
                file.startsWith('auto-backup-') || file.startsWith('production-backup-')
            ).sort().reverse(); // Mais recentes primeiro
            
            for (const backupDir of backupDirs) {
                const backupFile = path.join(this.dataPath, backupDir, fileName);
                
                try {
                    const content = await fs.readFile(backupFile, 'utf8');
                    JSON.parse(content); // Verificar se é JSON válido
                    
                    // Restaurar arquivo
                    const targetPath = path.join(this.dataPath, fileName);
                    await fs.copyFile(backupFile, targetPath);
                    
                    console.log(`✅ Arquivo ${fileName} recuperado de ${backupDir}`);
                    return;
                    
                } catch (error) {
                    continue; // Tentar próximo backup
                }
            }
            
            // Se não encontrou backup válido, criar arquivo vazio
            const targetPath = path.join(this.dataPath, fileName);
            await fs.writeFile(targetPath, JSON.stringify([], null, 2));
            console.log(`⚠️  Arquivo ${fileName} recriado vazio (sem backups válidos)`);
            
        } catch (error) {
            console.error(`❌ Erro ao recuperar ${fileName}:`, error.message);
        }
    }
}

module.exports = DataProtection;
