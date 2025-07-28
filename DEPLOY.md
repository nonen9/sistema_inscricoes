# 🚀 Deploy no EasyPanel - Configurações

## 📋 Variáveis de Ambiente Necessárias

### Configurações Básicas
```
NODE_ENV=production
PORT=3000
```

### Segurança
```
JWT_SECRET=seu-jwt-secret-super-seguro-mude-isso
ADMIN_PASSWORD=sua-senha-admin-super-segura
```

### CORS (Opcional)
```
CORS_ORIGIN=https://seu-dominio.com
```

### Rate Limiting (Opcional)
```
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## 🗂️ Configurações de Volume

### Volumes Persistentes
- **Data Volume**: `/app/data` -> Para armazenar dados dos campeonatos
- **Config Volume**: `/app/config` -> Para armazenar configurações de usuários

## 🔍 Health Check

- **Endpoint**: `/api/health`
- **Método**: GET
- **Resposta esperada**: Status 200 com JSON

## 🚀 Processo de Deploy

### 1. GitHub
1. Faça commit de todas as mudanças
2. Push para o repositório

### 2. EasyPanel
1. Crie novo projeto
2. Conecte ao GitHub
3. Configure variáveis de ambiente
4. Configure volumes persistentes
5. Deploy!

### 3. Pós-Deploy
1. Acesse `/api/health` para verificar status
2. Faça login no admin e altere a senha padrão
3. Teste criação de campeonato

## 📊 Monitoramento

- **Logs**: Monitore logs da aplicação
- **Health**: Endpoint `/api/health`
- **Performance**: CPU, Memória, Disco

## 🔒 Segurança Pós-Deploy

1. **Alterar senha admin**: Primeira prioridade
2. **JWT Secret**: Use um secret forte e único
3. **CORS**: Configure domínio específico se necessário
4. **Rate Limiting**: Ajuste conforme necessário

## 🐛 Troubleshooting

### Problemas Comuns

1. **Container não inicia**:
   - Verifique logs do container
   - Confirme que todas as variáveis estão definidas

2. **Dados não persistem**:
   - Verifique se volumes estão configurados corretamente
   - Confirme paths `/app/data` e `/app/config`

3. **Health check falha**:
   - Verifique se os diretórios existem
   - Confirme que o arquivo users.json foi criado

4. **Não consegue fazer login**:
   - Verifique se ADMIN_PASSWORD está configurado
   - Confirme que o usuário admin foi criado

### Comandos de Debug

```bash
# Verificar logs
docker logs container-name

# Acessar container
docker exec -it container-name sh

# Verificar arquivos
ls -la /app/data
ls -la /app/config

# Verificar usuário admin
cat /app/config/users.json
```
