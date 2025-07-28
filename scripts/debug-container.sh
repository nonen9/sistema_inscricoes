#!/bin/sh

echo "🔍 Verificando estrutura de arquivos no container..."

echo "📁 Estrutura do diretório /app:"
ls -la /app

echo "📁 Conteúdo da pasta public:"
if [ -d "/app/public" ]; then
    ls -la /app/public
else
    echo "❌ Pasta public não encontrada!"
fi

echo "📁 Conteúdo da pasta public/admin:"
if [ -d "/app/public/admin" ]; then
    ls -la /app/public/admin
else
    echo "❌ Pasta public/admin não encontrada!"
fi

echo "📁 Verificando arquivos específicos:"
files=(
    "/app/public/login.html"
    "/app/public/register.html" 
    "/app/public/registrations.html"
    "/app/public/style.css"
    "/app/public/auth.js"
    "/app/server.js"
    "/app/package.json"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - EXISTS"
    else
        echo "❌ $file - NOT FOUND"
    fi
done

echo "📊 Informações do sistema:"
echo "User: $(whoami)"
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "🔍 Verificação concluída!"
