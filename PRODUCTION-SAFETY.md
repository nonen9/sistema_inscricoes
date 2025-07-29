# 🔒 Sistema de Proteção de Dados - Guia de Produção

## ⚠️ ATENÇÃO CRÍTICA

Este sistema possui proteções automáticas para **PREVENIR PERDA DE DADOS** em produção. É fundamental seguir este guia.

## 🚨 Problemas que o sistema resolve:

1. **Dados de desenvolvimento indo para produção**
2. **Perda de dados durante rebuilds**
3. **Sobrescrita acidental de dados de produção**
4. **Falta de backups automáticos**

## 🛡️ Como funciona a proteção:

### 1. Detecção Automática de Ambiente
- O sistema detecta automaticamente se está em `development` ou `production`
- Cria um "fingerprint" dos dados para detectar mudanças de ambiente

### 2. Proteção contra Vazamento de Dados
**Se dados de desenvolvimento tentarem ir para produção:**
- ✅ Sistema faz backup dos dados de desenvolvimento
- ✅ Limpa automaticamente os arquivos para produção
- ✅ Registra o evento nos logs

### 3. Proteção de Dados de Produção
**Se dados de produção forem acessados em desenvolvimento:**
- ✅ Sistema faz backup completo dos dados de produção
- ✅ Previne sobrescrita acidental
- ✅ Mantém dados seguros

### 4. Backups Automáticos
- Backup automático a cada inicialização
- Backups pré-deploy
- Limpeza automática de backups antigos (mantém últimos 10)

## 🚀 Deploy Seguro

### Para EasyPanel ou Docker:

1. **Use as variáveis de ambiente corretas:**
```bash
NODE_ENV=production
DATA_PATH=/app/data
CONFIG_PATH=/app/config
```

2. **Execute o script de deploy seguro:**
```bash
# Linux/EasyPanel
./scripts/deploy-safe.sh

# Windows
.\scripts\deploy-safe.ps1
```

3. **Verifique os logs durante a inicialização:**
```bash
🔒 Inicializando sistema de proteção de dados...
🌍 Ambiente atual: production
📁 Diretório garantido: /app/data
📁 Diretório garantido: /app/config
🔐 Proteção de ambiente aplicada: production
💾 Criando backup automático de produção...
✅ Backup automático criado em: /app/data/auto-backup-...
🔍 Verificando integridade dos dados...
✅ tournaments.json: X registros válidos
✅ registrations.json: Y registros válidos
✅ players.json: Z registros válidos
🧹 Limpando backups antigos...
✅ Sistema de proteção de dados inicializado
```

## 📁 Estrutura de Dados Protegida

```
/app/data/
├── tournaments.json          # Dados principais
├── registrations.json        # Inscrições
├── players.json             # Base de jogadores
├── payment-status.json      # Status de pagamentos
├── .environment-lock        # Lock de proteção (NÃO MEXER)
├── auto-backup-TIMESTAMP/   # Backups automáticos
└── production-backup-*/     # Backups de proteção
```

## 🔧 Configuração de Produção

### 1. Arquivo .env para produção:
```bash
NODE_ENV=production
DATA_PATH=/app/data
CONFIG_PATH=/app/config
JWT_SECRET=CHAVE_SUPER_FORTE_AQUI
ADMIN_PASSWORD=SENHA_FORTE_ADMIN
PORT=3000
SESSION_TIMEOUT=8h
MAX_LOGIN_ATTEMPTS=3
```

### 2. Docker Volumes (OBRIGATÓRIO):
```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - DATA_PATH=/app/data
      - CONFIG_PATH=/app/config
    volumes:
      - app_data:/app/data      # PERSISTIR DADOS
      - app_config:/app/config  # PERSISTIR CONFIGURAÇÕES
    ports:
      - "3000:3000"

volumes:
  app_data:    # Volume persistente para dados
  app_config:  # Volume persistente para configurações
```

## 🚨 Sinais de Alerta nos Logs

### ⚠️ Mudança de ambiente detectada:
```
⚠️  MUDANÇA DE AMBIENTE DETECTADA!
📊 De: production → Para: development
🚨 TENTATIVA DE MUDANÇA DE PRODUÇÃO PARA DESENVOLVIMENTO!
🛡️  Protegendo dados de produção...
```

### ⚠️ Tentativa de vazamento de dados:
```
🚨 TENTATIVA DE ENVIO DE DADOS DE DESENVOLVIMENTO PARA PRODUÇÃO!
🚫 Prevenindo vazamento de dados de desenvolvimento...
⚠️  Arquivo tournaments.json contém X registros de desenvolvimento
🧹 Arquivo tournaments.json limpo para produção
```

### ❌ Erro crítico:
```
❌ Erro crítico na inicialização do servidor: [erro]
🚨 SERVIDOR NÃO SERÁ INICIADO POR SEGURANÇA
```

## 🔍 Monitoramento e Verificação

### 1. Health Check:
```bash
GET /api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "environment": "production",
  "files": {
    "users": true,
    "tournaments": true,
    "registrations": true,
    "players": true
  }
}
```

### 2. Verificar Backups:
```bash
ls -la /app/data/auto-backup-*
ls -la /app/data/production-backup-*
```

### 3. Verificar Logs:
```bash
# Docker
docker logs [container-id]

# EasyPanel
# Ver logs na interface do EasyPanel
```

## 🆘 Recuperação de Emergência

### Se dados foram perdidos:

1. **Verificar backups disponíveis:**
```bash
ls -la /app/data/*backup*
```

2. **Restaurar do backup mais recente:**
```bash
cp /app/data/auto-backup-TIMESTAMP/tournaments.json /app/data/
cp /app/data/auto-backup-TIMESTAMP/registrations.json /app/data/
cp /app/data/auto-backup-TIMESTAMP/players.json /app/data/
```

3. **Reiniciar aplicação**

### Se sistema não inicializa:

1. **Verificar logs detalhados**
2. **Verificar variáveis de ambiente**
3. **Verificar permissões dos diretórios**
4. **Verificar integridade dos arquivos JSON**

## ✅ Checklist de Deploy Seguro

- [ ] NODE_ENV=production definido
- [ ] Volumes Docker configurados para persistência
- [ ] Script deploy-safe executado
- [ ] Logs verificados durante inicialização
- [ ] Health check retorna status "ok"
- [ ] Backups automáticos sendo criados
- [ ] Dados anteriores preservados

## 📞 Contato para Suporte

Em caso de problemas críticos com perda de dados, imediatamente:

1. **NÃO REINICIAR** a aplicação
2. **PRESERVAR** todos os arquivos de backup
3. **DOCUMENTAR** o problema com logs completos
4. **ENTRAR EM CONTATO** para recuperação manual

---

**🔒 Este sistema foi projetado para ser à prova de falhas. Siga as instruções e seus dados estarão seguros!**
