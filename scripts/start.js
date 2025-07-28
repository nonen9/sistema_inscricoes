#!/usr/bin/env node

const initProduction = require('./init-production');

async function startApplication() {
    try {
        console.log('🚀 Iniciando aplicação...');
        
        // Executar inicialização
        await initProduction();
        
        console.log('📋 Iniciando servidor...');
        
        // Importar e iniciar o servidor
        require('../server.js');
        
    } catch (error) {
        console.error('❌ Erro ao iniciar aplicação:', error);
        process.exit(1);
    }
}

// Tratar sinais de terminação gracefuls
process.on('SIGTERM', () => {
    console.log('📝 Recebido SIGTERM, finalizando gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📝 Recebido SIGINT, finalizando gracefully...');
    process.exit(0);
});

startApplication();
