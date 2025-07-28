# 🏆 Sistema de Campeonatos

Um sistema web completo para gerenciar campeonatos esportivos e suas inscrições, desenvolvido com Node.js e Express.

## 🚀 Funcionalidades

### 🔧 Área Administrativa
- **Gestão de Campeonatos**: Criar, editar e gerenciar campeonatos
- **Categorias Personalizáveis**: Definir categorias como X1 (individual), X2 (duplas), Misto
- **Visualização de Inscrições**: Lista completa de todos os participantes inscritos
- **Exportação de Dados**: Exportar lista de inscrições em formato CSV
- **Dashboard Analítico**: Estatísticas e métricas em tempo real

### 🌐 Área Pública
- **Inscrições Online**: Interface responsiva para inscrição em campeonatos
- **Múltiplas Categorias**: Participantes podem se inscrever em várias categorias
- **Validação Automática**: Sistema valida limites e disponibilidade automaticamente
- **Interface Intuitiva**: Design moderno e fácil de usar

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Styling**: Tailwind CSS
- **Armazenamento**: JSON files (file-based database)
- **Autenticação**: JWT (JSON Web Tokens)
- **Arquitetura**: RESTful API

## ⚡ Instalação e Configuração

### Pré-requisitos
- Node.js (versão 14 ou superior)
- npm (gerenciador de pacotes do Node.js)

### 🔧 Passos para instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/sistema-campeonatos.git
cd sistema-campeonatos
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o usuário administrativo**
```bash
node generate-hash.js
```
Siga as instruções para criar seu usuário admin.

4. **Inicie o servidor**
```bash
npm start
```

O sistema estará disponível em `http://localhost:3000`

## 🐳 Deploy com Docker

### Usando Docker Compose (Recomendado)

```bash
# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Iniciar aplicação
docker-compose up -d

# Verificar logs
docker-compose logs -f
```

### Usando Docker diretamente

```bash
# Build da imagem
docker build -t sistema-campeonatos .

# Executar container
docker run -d \
  --name sistema-campeonatos \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=seu-jwt-secret \
  -e ADMIN_PASSWORD=sua-senha-admin \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/config:/app/config \
  sistema-campeonatos
```

## ☁️ Deploy no EasyPanel

Para deploy no EasyPanel, consulte o arquivo [`DEPLOY.md`](DEPLOY.md) para instruções detalhadas.

### Resumo do Deploy:

1. **Prepare o projeto**: Todas as configurações já estão prontas
2. **Conecte ao GitHub**: Configure seu repositório no EasyPanel
3. **Configure variáveis de ambiente**:
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=seu-jwt-secret-super-seguro
   ADMIN_PASSWORD=sua-senha-admin-segura
   ```
4. **Configure volumes persistentes**:
   - `/app/data` - Para dados dos campeonatos
   - `/app/config` - Para configurações de usuários
5. **Deploy**: O EasyPanel fará o build e deploy automaticamente

O sistema estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
sistema-campeonatos/
├── 📄 server.js              # Servidor principal Express
├── 👤 user-manager.js        # Gerenciamento de usuários
├── 🔐 generate-hash.js       # Script para criar usuário admin
├── 📦 package.json           # Dependências do projeto
├── 📋 ROADMAP-COMERCIAL.md   # Plano de negócio SaaS
├── 🔒 SECURITY.md           # Diretrizes de segurança
├── config/
│   └── 👥 users.json        # Arquivo de usuários
├── data/
│   ├── 🏆 tournaments.json  # Dados dos campeonatos
│   ├── 📝 registrations.json # Dados das inscrições
│   ├── 👤 players.json      # Dados dos jogadores
│   └── 💳 payment-status.json # Status de pagamentos
└── public/
    ├── 🔑 login.html        # Página de login
    ├── 📝 register.html     # Página de inscrição pública
    ├── 📊 registrations.html # Visualização de inscrições
    ├── 🎨 style.css         # Estilos principais
    ├── 🔐 auth.js           # Autenticação frontend
    └── admin/
        ├── 📊 index.html           # Dashboard admin
        ├── ➕ create-tournament.html # Criação de campeonatos
        ├── 🏆 tournaments.html     # Lista de campeonatos
        └── 👥 players.html         # Lista de jogadores
```

## 📖 Como Usar

### 1. 🔐 Acesso Administrativo
- Acesse `http://localhost:3000/login.html`
- Faça login com as credenciais criadas no setup
- Gerencie campeonatos através do painel administrativo

### 2. ➕ Criar Campeonato
- No painel admin, clique em "Criar Novo Campeonato"
- Preencha os dados: nome, data, local, preço
- Defina as categorias disponíveis (X1, X2, Misto)
- Configure limites de inscrições por categoria

### 3. 📝 Inscrições Públicas
- Compartilhe o link: `http://localhost:3000/register.html?tournament=ID_DO_CAMPEONATO`
- Os participantes podem se inscrever diretamente
- O sistema valida automaticamente disponibilidade e limites

### 4. 📊 Gerenciar Inscrições
- Visualize todas as inscrições no painel admin
- Exporte dados para CSV quando necessário
- Acompanhe estatísticas em tempo real

## 🏅 Tipos de Categoria

- **X1**: Categoria individual (1 jogador)
- **X2**: Categoria de duplas (2 jogadores do mesmo gênero)
- **Misto**: Categoria de duplas mistas (1 homem + 1 mulher)

## 🔒 Segurança

- Autenticação JWT para área administrativa
- Validação de dados no backend e frontend
- Sanitização de inputs
- Proteção contra ataques XSS e CSRF
- Controle de acesso baseado em roles

## 🚀 Roadmap Comercial

Este projeto tem potencial para se tornar um **SaaS para gestão de campeonatos esportivos**. Consulte o arquivo `ROADMAP-COMERCIAL.md` para detalhes sobre:

- Modelo de negócio multi-tenant
- Planos de assinatura (Starter, Professional, Enterprise)
- Funcionalidades futuras (WhatsApp, Analytics, White-label)
- Estratégia de monetização

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte ou dúvidas:
- 🐛 Abra uma issue no repositório do GitHub
- 📧 Entre em contato através do email de suporte
- 📖 Consulte a documentação completa

---

**Desenvolvido com ❤️ para a comunidade esportiva**
