const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Script de Gerenciamento de Usuários
 * Permite criar, atualizar e gerenciar usuários do sistema
 */

const USERS_FILE = path.join(__dirname, 'config', 'users.json');

class UserManager {
    constructor() {
        this.users = this.loadUsers();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    loadUsers() {
        try {
            if (fs.existsSync(USERS_FILE)) {
                return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usuários:', error.message);
        }
        return {};
    }

    saveUsers() {
        try {
            fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2));
            console.log('✅ Configuração de usuários salva com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao salvar usuários:', error.message);
        }
    }

    async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    async createUser(username, password, role = 'admin') {
        if (this.users[username]) {
            console.log(`⚠️  Usuário '${username}' já existe!`);
            return false;
        }

        const passwordHash = await this.hashPassword(password);
        
        this.users[username] = {
            username,
            passwordHash,
            role,
            createdAt: new Date().toISOString(),
            active: true
        };

        this.saveUsers();
        console.log(`✅ Usuário '${username}' criado com sucesso!`);
        return true;
    }

    async updatePassword(username, newPassword) {
        if (!this.users[username]) {
            console.log(`❌ Usuário '${username}' não encontrado!`);
            return false;
        }

        const passwordHash = await this.hashPassword(newPassword);
        this.users[username].passwordHash = passwordHash;
        this.users[username].updatedAt = new Date().toISOString();

        this.saveUsers();
        console.log(`✅ Senha do usuário '${username}' atualizada com sucesso!`);
        return true;
    }

    deactivateUser(username) {
        if (!this.users[username]) {
            console.log(`❌ Usuário '${username}' não encontrado!`);
            return false;
        }

        this.users[username].active = false;
        this.users[username].deactivatedAt = new Date().toISOString();

        this.saveUsers();
        console.log(`⚠️  Usuário '${username}' desativado!`);
        return true;
    }

    activateUser(username) {
        if (!this.users[username]) {
            console.log(`❌ Usuário '${username}' não encontrado!`);
            return false;
        }

        this.users[username].active = true;
        delete this.users[username].deactivatedAt;
        this.users[username].reactivatedAt = new Date().toISOString();

        this.saveUsers();
        console.log(`✅ Usuário '${username}' reativado!`);
        return true;
    }

    listUsers() {
        console.log('\n📋 Lista de Usuários:');
        console.log('====================');
        
        Object.values(this.users).forEach(user => {
            const status = user.active ? '🟢 Ativo' : '🔴 Inativo';
            console.log(`👤 ${user.username} - ${user.role} - ${status}`);
            console.log(`   Criado: ${new Date(user.createdAt).toLocaleString('pt-BR')}`);
            if (user.updatedAt) {
                console.log(`   Última atualização: ${new Date(user.updatedAt).toLocaleString('pt-BR')}`);
            }
            console.log('');
        });
    }

    question(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }

    async interactiveMenu() {
        console.log('\n🔐 Gerenciador de Usuários - Sistema de Torneios');
        console.log('===============================================');
        console.log('1. Listar usuários');
        console.log('2. Criar usuário');
        console.log('3. Atualizar senha');
        console.log('4. Desativar usuário');
        console.log('5. Ativar usuário');
        console.log('6. Sair');
        console.log('');

        const choice = await this.question('Escolha uma opção (1-6): ');

        switch (choice) {
            case '1':
                this.listUsers();
                break;
            case '2':
                await this.interactiveCreateUser();
                break;
            case '3':
                await this.interactiveUpdatePassword();
                break;
            case '4':
                await this.interactiveDeactivateUser();
                break;
            case '5':
                await this.interactiveActivateUser();
                break;
            case '6':
                console.log('👋 Encerrando...');
                this.rl.close();
                return;
            default:
                console.log('❌ Opção inválida!');
        }

        await this.interactiveMenu();
    }

    async interactiveCreateUser() {
        const username = await this.question('Nome de usuário: ');
        const password = await this.question('Senha: ');
        const role = await this.question('Função (admin): ') || 'admin';
        
        await this.createUser(username, password, role);
    }

    async interactiveUpdatePassword() {
        const username = await this.question('Nome de usuário: ');
        const password = await this.question('Nova senha: ');
        
        await this.updatePassword(username, password);
    }

    async interactiveDeactivateUser() {
        const username = await this.question('Nome de usuário para desativar: ');
        this.deactivateUser(username);
    }

    async interactiveActivateUser() {
        const username = await this.question('Nome de usuário para ativar: ');
        this.activateUser(username);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const manager = new UserManager();
    
    // Verificar se há argumentos de linha de comando
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // Modo não interativo
        const command = args[0];
        
        switch (command) {
            case 'list':
                manager.listUsers();
                break;
            case 'create':
                if (args.length >= 3) {
                    manager.createUser(args[1], args[2], args[3] || 'admin')
                        .then(() => process.exit(0));
                } else {
                    console.log('❌ Uso: node user-manager.js create <username> <password> [role]');
                }
                break;
            case 'password':
                if (args.length >= 3) {
                    manager.updatePassword(args[1], args[2])
                        .then(() => process.exit(0));
                } else {
                    console.log('❌ Uso: node user-manager.js password <username> <new_password>');
                }
                break;
            default:
                console.log('❌ Comando inválido. Use: list, create, password');
        }
    } else {
        // Modo interativo
        manager.interactiveMenu();
    }
}

module.exports = UserManager;
