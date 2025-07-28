const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function initProduction() {
    console.log('🚀 Inicializando ambiente de produção...');
    
    // Criar diretórios necessários
    const dirs = ['./data', './config'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Diretório criado: ${dir}`);
        }
    });
    
    // Criar arquivos de dados padrão se não existirem
    const dataFiles = [
        { path: './data/tournaments.json', content: '[]' },
        { path: './data/registrations.json', content: '[]' },
        { path: './data/players.json', content: '[]' },
        { path: './data/payment-status.json', content: '{}' }
    ];
    
    dataFiles.forEach(file => {
        if (!fs.existsSync(file.path)) {
            fs.writeFileSync(file.path, file.content);
            console.log(`📄 Arquivo criado: ${file.path}`);
        }
    });
    
    // Criar usuário admin padrão se não existir
    const usersPath = './config/users.json';
    if (!fs.existsSync(usersPath)) {
        const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        // Formato compatível com o servidor (objeto, não array)
        const users = {
            "admin": {
                "username": "admin",
                "passwordHash": hashedPassword,  // usar passwordHash, não password
                "role": "admin",
                "createdAt": new Date().toISOString(),
                "active": true
            }
        };
        
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
        console.log('👤 Usuário admin criado');
        console.log(`🔑 Username: admin`);
        console.log(`🔑 Password: ${defaultPassword}`);
        
        if (!process.env.ADMIN_PASSWORD) {
            console.log('⚠️  IMPORTANTE: Usando senha padrão "admin123"');
            console.log('⚠️  Altere a senha após o primeiro login!');
        }
    }
    
    console.log('✅ Inicialização concluída!');
}

// Executar apenas se chamado diretamente
if (require.main === module) {
    initProduction().catch(console.error);
}

module.exports = initProduction;
