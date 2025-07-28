# 🤝 Guia de Contribuição

Obrigado por considerar contribuir para o Sistema de Campeonatos! Este documento contém diretrizes para contribuir com o projeto.

## 📋 Código de Conduta

Este projeto adere ao [Código de Conduta do Contributor Covenant](https://www.contributor-covenant.org/). Ao participar, você deve aderir a este código.

## 🚀 Como Contribuir

### 🐛 Reportando Bugs

1. Verifique se o bug já não foi reportado nas [Issues](../../issues)
2. Use o template de Bug Report ao criar uma nova issue
3. Inclua o máximo de detalhes possível
4. Adicione screenshots se relevante

### ✨ Sugerindo Funcionalidades

1. Verifique se a funcionalidade já não foi sugerida
2. Use o template de Feature Request
3. Explique claramente o caso de uso
4. Considere o impacto no projeto

### 🔧 Enviando Código

#### Configuração do Ambiente

1. **Fork** o repositório
2. **Clone** seu fork:
   ```bash
   git clone https://github.com/SEU-USUARIO/sistema-campeonatos.git
   cd sistema-campeonatos
   ```
3. **Instale** as dependências:
   ```bash
   npm install
   ```
4. **Configure** o usuário admin:
   ```bash
   node generate-hash.js
   ```
5. **Inicie** o servidor de desenvolvimento:
   ```bash
   npm start
   ```

#### Processo de Desenvolvimento

1. **Crie uma branch** para sua funcionalidade:
   ```bash
   git checkout -b feature/nome-da-funcionalidade
   ```

2. **Faça suas mudanças** seguindo as diretrizes de código

3. **Teste** suas mudanças:
   - Teste funcionalidade localmente
   - Verifique se não quebrou funcionalidades existentes
   - Teste em diferentes navegadores (se UI)

4. **Commit** suas mudanças:
   ```bash
   git commit -m "tipo: descrição concisa da mudança"
   ```

5. **Push** para seu fork:
   ```bash
   git push origin feature/nome-da-funcionalidade
   ```

6. **Abra um Pull Request** usando o template fornecido

## 📝 Diretrizes de Código

### JavaScript

- Use **ES6+** features quando possível
- Prefira **const** e **let** ao invés de **var**
- Use **arrow functions** para callbacks simples
- Implemente **error handling** adequado
- Use nomes **descritivos** para variáveis e funções

```javascript
// ✅ Bom
const calculateTournamentPrice = (category, participants) => {
  try {
    return category.basePrice * participants.length;
  } catch (error) {
    console.error('Error calculating price:', error);
    throw new Error('Failed to calculate tournament price');
  }
};

// ❌ Evitar
var calc = function(cat, p) {
  return cat.price * p.length;
};
```

### HTML/CSS

- Use **HTML5** semântico
- Mantenha **acessibilidade** em mente
- Use **Tailwind CSS** para styling
- Mantenha **responsividade** mobile-first

### API Design

- Siga convenções **RESTful**
- Use **status codes** HTTP apropriados
- Implemente **validação** de dados
- Retorne **JSON** consistente

```javascript
// ✅ Boa resposta de API
{
  "success": true,
  "data": {
    "tournament": { ... }
  },
  "message": "Tournament created successfully"
}

// ✅ Boa resposta de erro
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid tournament data",
    "details": ["Name is required"]
  }
}
```

## 🏗️ Estrutura do Projeto

```
sistema-campeonatos/
├── server.js              # Servidor principal
├── user-manager.js        # Gerenciamento de usuários
├── generate-hash.js       # Utilitário para criar admin
├── config/                # Configurações
├── data/                  # Armazenamento JSON
└── public/                # Frontend
    ├── admin/             # Painel administrativo
    ├── *.html             # Páginas principais
    ├── *.css              # Estilos
    └── *.js               # Scripts frontend
```

## 🧪 Testes

### Testando Localmente

1. **Funcionalidades Admin**:
   - Login/logout
   - Criação de campeonatos
   - Visualização de inscrições
   - Exportação de dados

2. **Funcionalidades Públicas**:
   - Inscrição em campeonatos
   - Validação de categorias
   - Formulário responsivo

3. **API Endpoints**:
   - Teste com diferentes payloads
   - Verifique status codes
   - Teste error handling

### Cenários de Teste

- **Navegadores**: Chrome, Firefox, Safari, Edge
- **Dispositivos**: Desktop, Tablet, Mobile
- **Casos Edge**: Dados inválidos, limites de categoria, etc.

## 📋 Convenção de Commits

Use o formato: `tipo(escopo): descrição`

### Tipos:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças na documentação
- `style`: Formatação, ponto e vírgula, etc.
- `refactor`: Refatoração de código
- `test`: Adição de testes
- `chore`: Tarefas de manutenção

### Exemplos:
```bash
feat(admin): add tournament cloning functionality
fix(registration): resolve category validation issue
docs(readme): update installation instructions
refactor(api): simplify tournament creation endpoint
```

## 🔍 Review Process

### Pull Request Review

1. **Automated Checks**: Verificações básicas serão executadas automaticamente
2. **Code Review**: Maintainers revisarão o código
3. **Testing**: Funcionalidades serão testadas
4. **Merge**: PR será mergeado após aprovação

### Critérios de Aceitação

- [ ] Código funciona conforme esperado
- [ ] Segue diretrizes de estilo
- [ ] Inclui testes quando aplicável
- [ ] Documentação está atualizada
- [ ] Não quebra funcionalidades existentes

## 🏷️ Releases

### Versionamento

Seguimos [Semantic Versioning](https://semver.org/):
- **MAJOR**: Mudanças incompatíveis na API
- **MINOR**: Funcionalidades novas compatíveis
- **PATCH**: Correções de bugs compatíveis

### Process de Release

1. Mudanças são mergeadas na branch `main`
2. Tag de versão é criada
3. Release notes são geradas
4. Deploy é executado (se aplicável)

## 💬 Comunicação

### Onde Buscar Ajuda

- 📝 **Issues**: Para bugs e feature requests
- 💬 **Discussions**: Para perguntas gerais
- 📧 **Email**: Para questões privadas/sensíveis

### Respondemos em

- Issues: 1-3 dias úteis
- Pull Requests: 2-5 dias úteis
- Discussions: 1-7 dias

## 🎉 Reconhecimento

Contribuidores serão reconhecidos:
- Na seção de contributors do README
- Nas release notes quando aplicável
- Como maintainers para contribuições significativas

## 📚 Recursos Úteis

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [JWT Documentation](https://jwt.io/introduction)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)

---

**Obrigado por contribuir! 🚀**
