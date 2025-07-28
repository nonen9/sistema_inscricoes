# Sistema de Backup - Sistema de Inscrições de Torneios

Este documento explica como usar o sistema de backup implementado para proteger os dados durante deploys, especialmente no EasyPanel.

## 🚨 Problema Identificado

Durante deploys no EasyPanel, todos os dados do sistema foram perdidos porque:
1. O arquivo `.gitignore` estava excluindo os arquivos de dados (`data/`, `config/`)
2. Deploys baseados em Git não preservam arquivos não versionados
3. Não havia sistema de backup automático

## ✅ Solução Implementada

### 1. Sistema de Backup Automático (JavaScript)

**Localização**: `backup-manager.js`

**Funcionalidades**:
- Backup automático diário às 02:00
- Backup manual via API REST
- Limpeza automática (mantém últimos 30 backups)
- Backups compactados com timestamp

**Arquivos salvos**:
- `data/tournaments.json`
- `data/registrations.json`
- `data/players.json`
- `data/payment-status.json`
- `config/users.json`

### 2. Interface Web de Backup

**URL**: `/admin/backup.html`

**Funcionalidades**:
- Criar backup manual
- Listar backups disponíveis
- Restaurar dados de backup específico
- Visualizar informações de cada backup

**Acesso**: Apenas usuários administradores

### 3. Scripts Shell para Deploy Seguro

#### `scripts/backup.sh`
Cria backup manual com compressão:
```bash
# Uso básico
./backup.sh

# Backup com nome específico
./backup.sh "pre-easypanel-deploy"
```

#### `scripts/restore.sh`
Restaura dados de backup:
```bash
# Restaurar último backup
./restore.sh

# Restaurar backup específico
./restore.sh backup-2025-01-28_14-30-00.tar.gz
```

#### `scripts/safe-deploy.sh`
Script completo para deploy seguro:
```bash
# Backup antes do deploy
./safe-deploy.sh pre

# Verificação após deploy
./safe-deploy.sh post

# Deploy Docker completo
./safe-deploy.sh docker

# Status do sistema
./safe-deploy.sh status
```

## 🚀 Como Usar no EasyPanel

### Antes do Deploy

1. **Via Interface Web** (Recomendado):
   - Acesse `/admin/backup.html`
   - Clique em "Criar Backup"
   - Anote o nome do arquivo gerado

2. **Via Terminal** (se disponível):
   ```bash
   ./scripts/safe-deploy.sh pre
   ```

### Após o Deploy

1. **Verificação Automática**:
   - Acesse `/admin/backup.html`
   - Verifique se há backups listados
   - Se dados estão perdidos, use "Restaurar"

2. **Via Script** (se disponível):
   ```bash
   ./scripts/safe-deploy.sh post
   ```

## 📂 Estrutura de Backups

```
/data/backups/
├── 2025-01-28_02-00-00.tar.gz    # Backup automático
├── manual_2025-01-28_14-30-00/   # Backup manual
├── pre-deploy-2025-01-28/        # Backup pré-deploy
└── MANIFEST.txt                  # Informações do backup
```

### Formato do Backup

Cada backup contém:
```
backup-name/
├── MANIFEST.txt           # Informações do backup
├── data/
│   ├── tournaments.json
│   ├── registrations.json
│   ├── players.json
│   └── payment-status.json
└── config/
    └── users.json
```

## 🔧 Configuração Automática

### Backup Automático

O sistema está configurado para:
- **Horário**: 02:00 (horário do servidor)
- **Frequência**: Diária
- **Retenção**: 30 backups mais recentes
- **Localização**: `/data/backups/`

### APIs Disponíveis

**Criar Backup**:
```
POST /api/admin/backup
Authorization: Bearer <token>
```

**Listar Backups**:
```
GET /api/admin/backups
Authorization: Bearer <token>
```

**Restaurar Backup**:
```
POST /api/admin/restore
Authorization: Bearer <token>
Content-Type: application/json

{
  "filename": "backup-2025-01-28_14-30-00.tar.gz"
}
```

## 🛡️ Segurança

- Apenas usuários **admin** podem acessar backups
- Confirmação obrigatória para restauração
- Backup de segurança criado antes de restaurar
- Logs de todas as operações

## 🔍 Troubleshooting

### Problema: Dados perdidos após deploy

**Solução**:
1. Acesse `/admin/backup.html`
2. Verifique lista de backups disponíveis
3. Selecione backup mais recente
4. Clique em "Restaurar"
5. Confirme a operação
6. Reinicie a aplicação se necessário

### Problema: Nenhum backup disponível

**Solução**:
1. Verifique se `.gitignore` foi atualizado
2. Execute backup manual antes do próximo deploy
3. Configure volumes persistentes no Docker/EasyPanel

### Problema: Backup não funciona

**Verificações**:
1. Permissões de escrita na pasta `/data/backups/`
2. Espaço em disco suficiente
3. Logs do servidor para erros
4. Configuração do `BackupManager`

## 📋 Checklist para Deploy Seguro

### Antes do Deploy:
- [ ] Criar backup manual
- [ ] Verificar que backup foi criado com sucesso
- [ ] Anotar nome/timestamp do backup

### Durante o Deploy:
- [ ] Executar deploy normalmente
- [ ] Aguardar conclusão

### Após o Deploy:
- [ ] Verificar se aplicação subiu
- [ ] Acessar `/admin/backup.html`
- [ ] Verificar se dados estão presentes
- [ ] Se dados perdidos, restaurar último backup
- [ ] Testar funcionalidades principais

## 🚀 Melhorias Futuras

1. **Backup para Cloud**: S3, Google Drive, etc.
2. **Notificações**: Email/Slack quando backup falha
3. **Backup Incremental**: Apenas mudanças
4. **Agendamento Flexível**: Múltiplos horários
5. **Compressão Avançada**: Reduzir tamanho dos arquivos

## 📞 Suporte

Em caso de problemas com o sistema de backup:

1. Verifique logs do servidor
2. Acesse `/admin/backup.html` para diagnóstico
3. Use `./scripts/safe-deploy.sh status` para verificar sistema
4. Documente o problema e entre em contato com suporte

---

**Importante**: Este sistema foi criado especificamente para resolver a perda de dados durante deploys no EasyPanel. Sempre teste o processo de backup/restore em ambiente de desenvolvimento antes de usar em produção.
