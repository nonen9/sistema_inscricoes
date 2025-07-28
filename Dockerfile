FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Criar diretórios de dados se não existirem
RUN mkdir -p data config scripts

# Expor porta
EXPOSE 3000

# Definir usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Dar permissões aos diretórios
RUN chown -R nodejs:nodejs /app

USER nodejs

# Comando para iniciar a aplicação
CMD ["npm", "start"]
