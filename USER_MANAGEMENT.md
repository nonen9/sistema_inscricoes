# Sistema de Gerenciamento de Usuários

## Visão Geral

O sistema de inscrições para campeonatos agora inclui um sistema completo de gerenciamento de usuários, permitindo que administradores criem e gerenciem outros usuários que podem criar e organizar campeonatos.

## Tipos de Usuários

### 1. Administrador (`admin`)
- **Acesso completo**: Pode acessar todas as funcionalidades do sistema
- **Gerenciamento de usuários**: Pode criar, editar e desativar outros usuários
- **Gerenciamento de campeonatos**: Pode criar, editar e excluir campeonatos
- **Visualização de dados**: Acesso a relatórios e estatísticas completas

### 2. Organizador (`organizer`)
- **Criação de campeonatos**: Pode criar e gerenciar campeonatos
- **Visualização de inscrições**: Pode ver e gerenciar inscrições dos seus campeonatos
- **Acesso limitado**: Não pode gerenciar outros usuários
- **Relatórios**: Acesso a estatísticas dos seus campeonatos

## Como Usar

### Para Administradores

#### 1. Acessar o Gerenciamento de Usuários
1. Faça login no painel administrativo
2. Na página principal (Dashboard), clique em "Gerenciar Usuários"
3. Ou navegue diretamente para `/admin/users.html`

#### 2. Criar Novo Usuário
1. Clique no botão "Novo Usuário"
2. Preencha os dados:
   - **Nome de usuário**: Mínimo 3 caracteres, será usado para login
   - **Senha**: Mínimo 6 caracteres
   - **Confirmar senha**: Deve ser igual à senha
   - **Função**: Escolha entre "Administrador" ou "Organizador"
3. Clique em "Criar Usuário"

#### 3. Gerenciar Usuários Existentes
- **Alterar senha**: Clique em "Alterar Senha" ao lado do usuário
- **Desativar usuário**: Clique em "Desativar" para bloquear o acesso
- **Ativar usuário**: Clique em "Ativar" para reabilitar um usuário desativado

### Para Organizadores

1. **Login**: Use as credenciais fornecidas pelo administrador
2. **Dashboard**: Acesso limitado apenas às funcionalidades de campeonatos
3. **Criar campeonatos**: Use a seção "Criar Campeonato"
4. **Gerenciar inscrições**: Visualize e gerencie inscrições dos seus campeonatos

## Segurança

### Senhas
- **Mínimo 6 caracteres** para todas as senhas
- **Criptografia bcrypt** com salt rounds 10
- **Alteração de senhas** disponível apenas para administradores

### Autenticação
- **JWT tokens** para sessões seguras
- **Verificação de função** para controle de acesso
- **Auto-logout** em caso de token expirado

### Controles de Acesso
- **Middleware de autenticação** protege todas as rotas administrativas
- **Middleware de autorização** restringe funcionalidades por função
- **Validação de dados** em todas as operações

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/verify` - Verificar token
- `GET /api/auth/profile` - Perfil do usuário atual
- `POST /api/auth/logout` - Logout

### Gerenciamento de Usuários (Apenas Admin)
- `GET /api/admin/users` - Listar todos os usuários
- `POST /api/admin/users` - Criar novo usuário
- `PUT /api/admin/users/:username/password` - Alterar senha
- `PUT /api/admin/users/:username/status` - Ativar/desativar usuário

## Estrutura de Dados

### Arquivo de Usuários (`config/users.json`)
```json
{
  "admin": {
    "username": "admin",
    "passwordHash": "$2b$10$...",
    "role": "admin",
    "createdAt": "2025-01-28T...",
    "active": true
  },
  "organizador1": {
    "username": "organizador1",
    "passwordHash": "$2b$10$...",
    "role": "organizer",
    "createdAt": "2025-01-28T...",
    "active": true,
    "updatedAt": "2025-01-28T..."
  }
}
```

## Comandos Via Terminal

O sistema também inclui um script para gerenciamento via linha de comando:

```bash
# Modo interativo
node user-manager.js

# Comandos diretos
node user-manager.js list                              # Listar usuários
node user-manager.js create <username> <password>     # Criar usuário
node user-manager.js password <username> <newpass>    # Alterar senha
```

## Primeira Configuração

1. **Execute a inicialização**:
   ```bash
   npm run init
   ```

2. **Faça login com o usuário padrão**:
   - Username: `admin`
   - Password: `admin123` (ou valor da variável `ADMIN_PASSWORD`)

3. **Altere a senha padrão**:
   - Acesse "Gerenciar Usuários"
   - Clique em "Alterar Senha" para o usuário admin
   - Defina uma senha segura

4. **Crie usuários adicionais**:
   - Use a interface "Novo Usuário"
   - Defina funções apropriadas para cada usuário

## Boas Práticas

### Para Administradores
- **Senhas fortes**: Use senhas complexas com pelo menos 8 caracteres
- **Princípio do menor privilégio**: Crie organizadores em vez de admins quando possível
- **Auditoria regular**: Desative usuários que não precisam mais de acesso
- **Backup**: Mantenha backup do arquivo `config/users.json`

### Para Organizadores
- **Acesso limitado**: Lembre-se que você não pode criar outros usuários
- **Colaboração**: Coordene com administradores para necessidades especiais
- **Dados**: Mantenha registros organizados dos seus campeonatos

## Troubleshooting

### Problemas Comuns
1. **"Usuário já existe"**: Escolha um nome de usuário diferente
2. **"Senha muito curta"**: Use pelo menos 6 caracteres
3. **"Acesso negado"**: Verifique se tem permissões de administrador
4. **"Token expirado"**: Faça login novamente

### Logs
- Todas as operações são logadas no console do servidor
- Tentativas de login são registradas com timestamps
- Erros de autenticação são detalhados nos logs

### Recuperação
- Se esquecer credenciais de admin, use `node user-manager.js` no terminal
- O arquivo `config/users.json` pode ser editado manualmente se necessário
- Em caso de corrupção, execute `npm run init` para recriar o usuário admin padrão
