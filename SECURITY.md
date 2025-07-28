# 🔐 Sistema de Autenticação Aprimorado

## 📋 Melhorias Implementadas

### ✅ **Segurança de Senhas**
- **Hash bcrypt**: Senhas agora são criptografadas com bcrypt (salt rounds: 10)
- **Sem texto claro**: Senhas nunca são armazenadas em texto simples
- **Verificação segura**: Comparação usando bcrypt.compare()

### ✅ **Tokens JWT**
- **JWT padrão**: Substitui tokens simples base64
- **Expiração configurável**: 24h por padrão (configurável via .env)
- **Assinatura digital**: Tokens assinados com chave secreta
- **Metadados**: Inclui username, role, timestamp

### ✅ **Configuração Flexível**
- **Arquivo .env**: Variáveis de ambiente para configurações
- **users.json**: Arquivo de configuração de usuários
- **Múltiplos usuários**: Suporte a vários administradores
- **Roles**: Sistema de permissões (preparado para expansão)

### ✅ **Ferramentas de Gerenciamento**
- **generate-hash.js**: Script para gerar hashes de senha
- **user-manager.js**: Ferramenta completa de gerenciamento de usuários
- **Scripts npm**: Comandos facilitados no package.json

## 🚀 **Como Usar**

### **Configuração Inicial**
```bash
# 1. Gerar hash da senha padrão
npm run setup

# 2. Listar usuários existentes
npm run list-users

# 3. Criar novo usuário
npm run create-user novouser senha123 admin
```

### **Gerenciamento Interativo**
```bash
# Abre menu interativo de gerenciamento
npm run users
```

### **Comandos Diretos**
```bash
# Criar usuário
node user-manager.js create username password role

# Atualizar senha
node user-manager.js password username nova_senha

# Listar usuários
node user-manager.js list
```

## 🔧 **Configuração via .env**

```env
# Autenticação
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=sua_chave_secreta_muito_forte

# Servidor
PORT=3000
NODE_ENV=development

# Segurança
SESSION_TIMEOUT=24h
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=15m
```

## 📁 **Estrutura de Arquivos**

```
├── config/
│   └── users.json          # Configuração de usuários
├── .env                    # Variáveis de ambiente
├── generate-hash.js        # Gerador de hash de senhas
├── user-manager.js         # Gerenciador de usuários
└── server.js              # Servidor com autenticação JWT
```

## 🔐 **Formato do users.json**

```json
{
  "admin": {
    "username": "admin",
    "passwordHash": "$2b$10$VvNgcjLYygbJVtIl.qGbUe...",
    "role": "admin",
    "createdAt": "2025-01-20T10:30:00.000Z",
    "active": true
  }
}
```

## 🛡️ **Recursos de Segurança**

### **Middleware de Autenticação**
- Verificação JWT obrigatória
- Validação de usuário ativo
- Tratamento de tokens expirados
- Logs de segurança

### **Rotas de Autenticação**
- `POST /api/auth/login` - Login com bcrypt + JWT
- `POST /api/auth/logout` - Logout com log
- `GET /api/auth/verify` - Verificação de token
- `GET /api/auth/profile` - Perfil do usuário

### **Logs de Segurança**
- ✅ Login bem-sucedido
- ❌ Tentativas de login falhadas
- 🚪 Eventos de logout
- 🔍 Validações de token

## 🎯 **Benefícios Alcançados**

1. **Segurança**: Senhas hasheadas, tokens JWT seguros
2. **Flexibilidade**: Múltiplos usuários, configuração via .env
3. **Manutenibilidade**: Ferramentas de gerenciamento
4. **Auditoria**: Logs detalhados de eventos
5. **Escalabilidade**: Base para sistema de permissões

## 🔄 **Migração da Versão Anterior**

A migração é **automática**:
- Credenciais antigas (`admin/admin123`) continuam funcionando
- Novos tokens JWT são gerados automaticamente
- Sistema detecta se arquivo users.json existe
- Fallback para configuração de emergência

## ⚠️ **Recomendações**

1. **Altere a senha padrão** após primeira configuração
2. **Configure JWT_SECRET** forte no .env
3. **Monitore logs** de tentativas de login
4. **Backup** do arquivo users.json
5. **Rotacione senhas** periodicamente

---

**Status**: ✅ Implementado e funcionando
**Versão**: 2.0 - Sistema de Autenticação Seguro
