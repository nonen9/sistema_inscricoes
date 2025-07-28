# 🚀 Guia de Publicação no GitHub

Este arquivo contém as instruções para publicar o projeto no GitHub.

## 📋 Pré-requisitos

1. **Conta no GitHub**: Crie uma conta em [github.com](https://github.com) se ainda não tiver
2. **Git configurado**: Certifique-se de ter o Git instalado e configurado no seu sistema

## 🔧 Configuração Inicial do Git (se necessário)

Se ainda não configurou o Git no seu sistema, execute:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"
```

## 📂 Passos para Publicar no GitHub

### 1. Criar Repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique no botão **"New"** ou **"+"** no canto superior direito
3. Escolha **"New repository"**
4. Preencha os dados:
   - **Repository name**: `sistema-campeonatos`
   - **Description**: `Sistema web completo para gerenciar campeonatos esportivos e suas inscrições`
   - **Visibility**: Escolha Public ou Private
   - **NÃO** marque "Add a README file" (já temos um)
   - **NÃO** marque "Add .gitignore" (já temos um)
   - **License**: Escolha MIT License
5. Clique em **"Create repository"**

### 2. Conectar Repositório Local ao GitHub

Execute os comandos abaixo no terminal (substitua `SEU-USUARIO` pelo seu username do GitHub):

```bash
# Navegar para a pasta do projeto
cd d:\reisdamesa\inscricoes

# Adicionar o repositório remoto
git remote add origin https://github.com/SEU-USUARIO/sistema-campeonatos.git

# Renomear a branch principal para main (padrão do GitHub)
git branch -M main

# Fazer o primeiro push
git push -u origin main

# Fazer push das tags
git push origin --tags
```

### 3. Verificar se tudo foi enviado

Após executar os comandos, acesse o repositório no GitHub para verificar se todos os arquivos foram enviados corretamente.

## 🔄 Comandos para Futuras Atualizações

Para futuras modificações no código:

```bash
# Adicionar mudanças
git add .

# Fazer commit
git commit -m "Descrição das mudanças"

# Enviar para o GitHub
git push origin main
```

## 🏷️ Criando Releases

Para criar uma nova versão:

```bash
# Criar nova tag
git tag -a v1.1.0 -m "Versão 1.1.0 - Descrição das mudanças"

# Enviar tag para o GitHub
git push origin v1.1.0
```

Depois, no GitHub:
1. Vá para a aba **"Releases"**
2. Clique em **"Create a new release"**
3. Escolha a tag criada
4. Adicione título e descrição
5. Publique o release

## 📝 Atualizar README

Lembre-se de atualizar as URLs no README.md após criar o repositório:

1. Substitua `https://github.com/seu-usuario/sistema-campeonatos.git` pela URL real
2. Atualize os links de issues e documentação
3. Faça commit das mudanças

## 🎯 Próximos Passos Recomendados

Após publicar no GitHub:

1. **Configurar GitHub Pages** (se quiser hospedar a documentação)
2. **Adicionar Issues Templates** para bug reports e feature requests
3. **Configurar GitHub Actions** para CI/CD automatizado
4. **Adicionar badges** no README (build status, license, etc.)
5. **Criar uma Wiki** com documentação detalhada

## 🔒 Segurança

⚠️ **IMPORTANTE**: Certifique-se de que:
- Nenhuma senha ou token está no código
- O arquivo `config/users.json` não está sendo versionado (está no .gitignore)
- Dados sensíveis estão protegidos

## 📞 Suporte

Se encontrar problemas durante a publicação:
1. Verifique se o Git está instalado corretamente
2. Confirme que tem permissões no repositório
3. Consulte a [documentação oficial do GitHub](https://docs.github.com)

---

**Boa sorte com seu projeto! 🚀**
