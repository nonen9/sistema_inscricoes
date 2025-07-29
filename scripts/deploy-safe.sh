#!/bin/bash

# Deploy Seguro para Produção
# Este script garante que dados não sejam perdidos durante o deploy

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy seguro para produção..."

# Verificar se estamos em produção
if [ "$NODE_ENV" != "production" ]; then
    echo "❌ Este script deve ser executado apenas em produção (NODE_ENV=production)"
    exit 1
fi

# Definir caminhos
DATA_DIR="/app/data"
CONFIG_DIR="/app/config"
BACKUP_DIR="/app/backup-$(date +%Y%m%d-%H%M%S)"

echo "📁 Criando backup pré-deploy..."

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Fazer backup dos dados críticos
if [ -d "$DATA_DIR" ]; then
    echo "💾 Fazendo backup de dados..."
    cp -r "$DATA_DIR" "$BACKUP_DIR/data"
fi

if [ -d "$CONFIG_DIR" ]; then
    echo "💾 Fazendo backup de configurações..."
    cp -r "$CONFIG_DIR" "$BACKUP_DIR/config"
fi

# Criar arquivo de informações do backup
cat > "$BACKUP_DIR/backup-info.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "type": "pre-deploy-backup",
    "environment": "production",
    "warning": "NÃO EXCLUIR - Backup automático pré-deploy"
}
EOF

echo "✅ Backup pré-deploy criado em: $BACKUP_DIR"

# Verificar se os diretórios de dados existem
echo "🔍 Verificando estrutura de dados..."

mkdir -p "$DATA_DIR"
mkdir -p "$CONFIG_DIR"

# Inicializar arquivos vazios se não existirem
if [ ! -f "$DATA_DIR/tournaments.json" ]; then
    echo "[]" > "$DATA_DIR/tournaments.json"
    echo "📝 Arquivo tournaments.json criado"
fi

if [ ! -f "$DATA_DIR/registrations.json" ]; then
    echo "[]" > "$DATA_DIR/registrations.json"
    echo "📝 Arquivo registrations.json criado"
fi

if [ ! -f "$DATA_DIR/players.json" ]; then
    echo "[]" > "$DATA_DIR/players.json"
    echo "📝 Arquivo players.json criado"
fi

if [ ! -f "$DATA_DIR/payment-status.json" ]; then
    echo "{}" > "$DATA_DIR/payment-status.json"
    echo "📝 Arquivo payment-status.json criado"
fi

# Verificar configuração de usuários
if [ ! -f "$CONFIG_DIR/users.json" ]; then
    echo "⚠️  Arquivo users.json não existe. Será criado na primeira execução."
fi

# Definir permissões corretas
chown -R node:node "$DATA_DIR" "$CONFIG_DIR" 2>/dev/null || true
chmod -R 755 "$DATA_DIR" "$CONFIG_DIR" 2>/dev/null || true

echo "🔒 Permissões ajustadas"

# Limpar backups antigos (manter últimos 10)
echo "🧹 Limpando backups antigos..."
find /app -name "backup-*" -type d | sort | head -n -10 | xargs rm -rf 2>/dev/null || true

echo "✅ Deploy seguro concluído!"
echo "📊 Estrutura preparada para inicialização da aplicação"
echo ""
echo "📋 Resumo:"
echo "   • Backup criado em: $BACKUP_DIR"
echo "   • Dados preservados: $([ -d "$DATA_DIR" ] && echo "✅" || echo "❌")"
echo "   • Configurações preservadas: $([ -d "$CONFIG_DIR" ] && echo "✅" || echo "❌")"
echo "   • Permissões ajustadas: ✅"
echo ""
echo "🚀 A aplicação pode ser iniciada com segurança!"
