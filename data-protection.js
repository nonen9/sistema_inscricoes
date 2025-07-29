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
        
        // FORÇA verificação e recuperação de arquivos críticos
        await this.forceRecoveryCheck();
        
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
     * FORÇA verificação e recuperação de arquivos críticos
     */
    async forceRecoveryCheck() {
        console.log('🔍 VERIFICAÇÃO FORÇADA: Checando arquivos críticos...');
        
        const criticalFiles = [
            path.join(this.dataPath, 'tournaments.json'),
            path.join(this.dataPath, 'registrations.json'),
            path.join(this.dataPath, 'players.json'),
            path.join(this.dataPath, 'payment-status.json')
        ];
        
        for (const filePath of criticalFiles) {
            try {
                // Verifica se arquivo existe e tem conteúdo válido
                let needsRecovery = false;
                
                if (!fsSync.existsSync(filePath)) {
                    console.log(`❌ Arquivo não existe: ${filePath}`);
                    needsRecovery = true;
                } else {
                    const content = fsSync.readFileSync(filePath, 'utf8').trim();
                    if (content === '' || content === '[]' || content === '{}') {
                        console.log(`❌ Arquivo vazio/inválido: ${filePath}`);
                        needsRecovery = true;
                    } else {
                        try {
                            JSON.parse(content);
                            console.log(`✅ Arquivo OK: ${filePath}`);
                        } catch {
                            console.log(`❌ JSON inválido: ${filePath}`);
                            needsRecovery = true;
                        }
                    }
                }
                
                // Tenta recuperar se necessário
                if (needsRecovery) {
                    console.log(`🔄 Tentando recuperar: ${filePath}`);
                    const recovered = this.recoverFileFromBackups(filePath);
                    if (recovered) {
                        console.log(`✅ SUCESSO: ${filePath} recuperado!`);
                    } else {
                        console.log(`⚠️  Criando arquivo padrão: ${filePath}`);
                        fsSync.writeFileSync(filePath, JSON.stringify([], null, 2));
                    }
                }
            } catch (error) {
                console.error(`❌ Erro verificando ${filePath}:`, error.message);
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
        
        // PROTEÇÃO TEMPORARIAMENTE DESABILITADA - EVITAR PERDA DE DADOS
        console.log('🛡️  Sistema de proteção em modo seguro - DADOS PRESERVADOS');
        
        // Fazer apenas backup dos dados atuais
        await this.createProductionBackup();
        
        console.log('✅ Dados preservados durante mudança de ambiente');
        
        // TODO: Implementar proteção mais inteligente que não apague dados válidos
        /*
        if (oldLock.environment === 'production' && newLock.environment === 'development') {
            console.log('🚨 TENTATIVA DE MUDANÇA DE PRODUÇÃO PARA DESENVOLVIMENTO!');
            await this.protectProductionData();
        }
        
        if (oldLock.environment === 'development' && newLock.environment === 'production') {
            console.log('🚨 TENTATIVA DE ENVIO DE DADOS DE DESENVOLVIMENTO PARA PRODUÇÃO!');
            await this.preventDevelopmentDataLeak();
        }
        */
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
                
                // USAR A FUNÇÃO CORRIGIDA DE RECUPERAÇÃO
                console.log(`🔄 Tentando recuperar ${file}...`);
                const recovered = await this.recoverFileFromBackups(file);
                if (!recovered) {
                    // Se não conseguiu recuperar, criar arquivo vazio
                    await fs.writeFile(filePath, JSON.stringify([], null, 2));
                    console.log(`⚠️  Arquivo ${file} recriado vazio (sem backups válidos)`);
                }
            }
        }
    }

    /**
     * Recupera dados de backups mais recentes em caso de perda
     */
    async emergencyDataRecovery() {
        console.log('🆘 INICIANDO RECUPERAÇÃO DE EMERGÊNCIA...');
        
        const files = [
            'tournaments.json',
            'registrations.json',
            'players.json'
        ];
        
        let recoveredFiles = 0;
        
        for (const file of files) {
            const currentPath = path.join(this.dataPath, file);
            
            try {
                // SEMPRE verificar se há dados válidos, mesmo que o arquivo exista
                let needsRecovery = false;
                let currentDataCount = 0;
                
                try {
                    const currentContent = await fs.readFile(currentPath, 'utf8');
                    const currentData = JSON.parse(currentContent);
                    if (!Array.isArray(currentData)) {
                        needsRecovery = true;
                        console.log(`⚠️  ${file} não é um array válido`);
                    } else {
                        currentDataCount = currentData.length;
                        if (currentDataCount === 0) {
                            console.log(`⚠️  ${file} está vazio, verificando se há backups...`);
                            needsRecovery = true;
                        } else {
                            console.log(`ℹ️  ${file} tem ${currentDataCount} registros`);
                        }
                    }
                } catch (error) {
                    needsRecovery = true;
                    console.log(`⚠️  ${file} não existe ou está corrompido`);
                }
                
                if (needsRecovery) {
                    console.log(`🔍 Tentando recuperar ${file}...`);
                    
                    const recovered = await this.recoverFileFromBackups(file);
                    if (recovered) {
                        recoveredFiles++;
                        
                        // Verificar quantos registros foram recuperados
                        try {
                            const recoveredContent = await fs.readFile(currentPath, 'utf8');
                            const recoveredData = JSON.parse(recoveredContent);
                            console.log(`✅ ${file} recuperado com ${recoveredData.length} registros`);
                        } catch (error) {
                            console.log(`✅ ${file} recuperado (erro ao verificar conteúdo)`);
                        }
                    } else {
                        console.log(`⚠️  ${file} não pôde ser recuperado - criando vazio`);
                        await fs.writeFile(currentPath, JSON.stringify([], null, 2));
                    }
                } else if (currentDataCount > 0) {
                    // Arquivo tem dados válidos, fazer backup preventivo
                    const preventiveBackupPath = path.join(this.dataPath, `current-backup-${file}`);
                    try {
                        await fs.copyFile(currentPath, preventiveBackupPath);
                        console.log(`💾 Backup preventivo criado: current-backup-${file}`);
                    } catch (error) {
                        console.log(`⚠️  Erro ao criar backup preventivo de ${file}`);
                    }
                }
            } catch (error) {
                console.error(`❌ Erro na recuperação de ${file}:`, error.message);
            }
        }
        
        console.log(`🎯 Recuperação concluída: ${recoveredFiles} arquivos recuperados/verificados`);
        return recoveredFiles;
    }

    /**
     * Recupera um arquivo específico dos backups
     */
    async recoverFileFromBackups(fileName) {
        console.log(`🔍 Procurando ${fileName} em backups...`);
        
        try {
            // PRIORITY 1: Procurar em dev-backup primeiro (dados mais recentes que foram "limpos")
            const devBackupPath = path.join(this.dataPath, `dev-backup-${fileName}`);
            try {
                const content = await fs.readFile(devBackupPath, 'utf8');
                const data = JSON.parse(content);
                if (Array.isArray(data) && data.length > 0) {
                    const targetPath = path.join(this.dataPath, fileName);
                    await fs.writeFile(targetPath, content);
                    console.log(`🔄 ${fileName} recuperado de dev-backup com ${data.length} registros`);
                    return true;
                }
            } catch (error) {
                console.log(`ℹ️  dev-backup-${fileName} não encontrado ou vazio`);
            }
            
            // PRIORITY 2: Procurar em backups automáticos (mais recentes primeiro)
            let backupDirs = [];
            try {
                const files = await fs.readdir(this.dataPath);
                backupDirs = files.filter(file => 
                    file.startsWith('auto-backup-') || 
                    file.startsWith('production-backup-')
                ).sort().reverse(); // Mais recentes primeiro
                
                console.log(`📁 Encontrados ${backupDirs.length} diretórios de backup`);
            } catch (error) {
                console.log(`ℹ️  Nenhum diretório de backup encontrado`);
            }
            
            for (const backupDir of backupDirs) {
                const backupFile = path.join(this.dataPath, backupDir, fileName);
                
                try {
                    const content = await fs.readFile(backupFile, 'utf8');
                    const data = JSON.parse(content);
                    
                    if (Array.isArray(data) && data.length > 0) {
                        const targetPath = path.join(this.dataPath, fileName);
                        await fs.writeFile(targetPath, content);
                        console.log(`🔄 ${fileName} recuperado de ${backupDir} com ${data.length} registros`);
                        return true;
                    }
                } catch (error) {
                    console.log(`ℹ️  ${backupDir}/${fileName} não encontrado ou inválido`);
                    continue;
                }
            }
            
            // PRIORITY 3: Procurar em backups do sistema principal (se existirem)
            try {
                const mainBackupDir = path.join(__dirname, 'backups');
                const backupFiles = await fs.readdir(mainBackupDir);
                
                for (const dateDir of backupFiles.sort().reverse()) {
                    const backupFile = path.join(mainBackupDir, dateDir, fileName);
                    try {
                        const content = await fs.readFile(backupFile, 'utf8');
                        const data = JSON.parse(content);
                        
                        if (Array.isArray(data) && data.length > 0) {
                            const targetPath = path.join(this.dataPath, fileName);
                            await fs.writeFile(targetPath, content);
                            console.log(`🔄 ${fileName} recuperado de backup principal ${dateDir} com ${data.length} registros`);
                            return true;
                        }
                    } catch (error) {
                        continue;
                    }
                }
            } catch (error) {
                console.log(`ℹ️  Backup principal não encontrado`);
            }
            
            console.log(`❌ Não foi possível recuperar ${fileName} - nenhum backup válido encontrado`);
            return false;
            
        } catch (error) {
            console.error(`❌ Erro ao recuperar ${fileName}:`, error.message);
            return false;
        }
    }
}

module.exports = DataProtection;
