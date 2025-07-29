#!/bin/bash

# Script de Recuperação de Emergência para EasyPanel
# Este script tenta recuperar dados perdidos durante deploy

echo "🆘 RECUPERAÇÃO DE EMERGÊNCIA PARA EASYPANEL"
echo "============================================"

# Verificar ambiente
if [ "$NODE_ENV" = "production" ]; then
    echo "✅ Ambiente: PRODUÇÃO"
else
    echo "⚠️  Ambiente: $NODE_ENV (definindo como produção)"
    export NODE_ENV=production
fi

DATA_DIR="${DATA_PATH:-/app/data}"
echo "📁 Diretório de dados: $DATA_DIR"

# Verificar se diretório existe
if [ ! -d "$DATA_DIR" ]; then
    echo "❌ Diretório de dados não encontrado: $DATA_DIR"
    exit 1
fi

cd "$DATA_DIR" || exit 1

echo ""
echo "🔍 VERIFICANDO ARQUIVOS ATUAIS..."
echo "=================================="

# Verificar status dos arquivos principais
for file in tournaments.json registrations.json players.json; do
    if [ -f "$file" ]; then
        size=$(wc -c < "$file" 2>/dev/null || echo "0")
        lines=$(grep -c '"' "$file" 2>/dev/null || echo "0")
        echo "📄 $file: ${size} bytes, ~${lines} elementos"
        
        # Se arquivo tem menos de 10 bytes, provavelmente só tem []
        if [ "$size" -lt 10 ]; then
            echo "⚠️  ARQUIVO MUITO PEQUENO - POSSÍVEL PERDA DE DADOS"
        fi
    else
        echo "❌ $file: NÃO ENCONTRADO"
    fi
done

echo ""
echo "🔍 PROCURANDO BACKUPS..."
echo "========================"

# Procurar por arquivos de backup
backup_found=false

# Verificar dev-backup-* (prioridade alta)
for backup in dev-backup-*.json; do
    if [ -f "$backup" ]; then
        size=$(wc -c < "$backup" 2>/dev/null || echo "0")
        echo "💾 Encontrado: $backup (${size} bytes)"
        backup_found=true
    fi
done

# Verificar auto-backup-* (prioridade média)
for dir in auto-backup-*/ production-backup-*/; do
    if [ -d "$dir" ]; then
        echo "📁 Backup directory: $dir"
        for file in tournaments.json registrations.json players.json; do
            if [ -f "$dir/$file" ]; then
                size=$(wc -c < "$dir/$file" 2>/dev/null || echo "0")
                echo "   💾 $file: ${size} bytes"
                backup_found=true
            fi
        done
    fi
done

if [ "$backup_found" = false ]; then
    echo "❌ NENHUM BACKUP ENCONTRADO!"
    echo ""
    echo "📋 ARQUIVOS DISPONÍVEIS:"
    ls -la
    exit 1
fi

echo ""
echo "🔄 INICIANDO RECUPERAÇÃO AUTOMÁTICA..."
echo "====================================="

# Executar recuperação via Node.js
cd /app || exit 1

if [ -f "data-protection.js" ]; then
    echo "🚀 Executando recuperação automática..."
    node -e "
        const DataProtection = require('./data-protection');
        const dp = new DataProtection();
        dp.emergencyDataRecovery()
            .then(count => {
                console.log(\`✅ Recuperação concluída: \${count} arquivos processados\`);
                process.exit(0);
            })
            .catch(error => {
                console.error('❌ Erro na recuperação:', error.message);
                process.exit(1);
            });
    "
    
    recovery_exit_code=$?
    
    if [ $recovery_exit_code -eq 0 ]; then
        echo ""
        echo "✅ RECUPERAÇÃO CONCLUÍDA COM SUCESSO!"
        echo "===================================="
        
        # Verificar resultados
        cd "$DATA_DIR" || exit 1
        for file in tournaments.json registrations.json players.json; do
            if [ -f "$file" ]; then
                size=$(wc -c < "$file" 2>/dev/null || echo "0")
                lines=$(grep -c '"' "$file" 2>/dev/null || echo "0")
                echo "📄 $file: ${size} bytes, ~${lines} elementos"
            fi
        done
        
    else
        echo "❌ RECUPERAÇÃO AUTOMÁTICA FALHOU"
        echo "Tentando recuperação manual..."
        
        cd "$DATA_DIR" || exit 1
        
        # Recuperação manual de dev-backup
        for backup in dev-backup-*.json; do
            if [ -f "$backup" ]; then
                original_file=$(echo "$backup" | sed 's/dev-backup-//')
                size=$(wc -c < "$backup" 2>/dev/null || echo "0")
                
                if [ "$size" -gt 10 ]; then
                    echo "🔄 Recuperando $original_file de $backup"
                    cp "$backup" "$original_file"
                    echo "✅ $original_file recuperado"
                fi
            fi
        done
    fi
else
    echo "❌ data-protection.js não encontrado!"
    exit 1
fi

echo ""
echo "🎯 RECUPERAÇÃO DE EMERGÊNCIA FINALIZADA"
echo "======================================"
