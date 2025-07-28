FROM node:18-alpine

# Instalar curl para health checks
RUN apk add --no-cache curl

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json primeiro
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar todo o código da aplicação
COPY . .

# Debug: Verificar se os arquivos foram copiados
RUN echo "📁 Verificando estrutura após COPY:" && ls -la /app
RUN echo "📁 Verificando pasta public:" && ls -la /app/public/ || echo "❌ Pasta public não encontrada"

# Criar diretórios necessários
RUN mkdir -p data config scripts

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Dar permissões corretas aos diretórios
RUN chown -R nodejs:nodejs /app && \
    chmod -R 755 /app && \
    chmod +x /app/scripts/*.sh 2>/dev/null || true

# Debug: Verificar permissões
RUN echo "📋 Verificando permissões:" && ls -la /app/

# Trocar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
