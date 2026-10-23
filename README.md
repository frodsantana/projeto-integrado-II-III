# Sistema Acadêmico — Universidade Anhanguera

Aplicação web para administrar cursos, matérias, professores, salas e cronogramas semestrais. O projeto é o Projeto Integrado II/III da Universidade Anhanguera.

A versão principal usa **React, TypeScript, Vite e Tailwind CSS** na interface, **Java 17, Spring Boot e Spring Data JPA** na API e **PostgreSQL** para armazenar os dados. O **Flyway** aplica as alterações de esquema. A interface se comunica com a API; os cadastros e as aulas não dependem do armazenamento local do navegador.

## Versões do projeto

O repositório mantém as versões em branches distintas:

| Branch | Conteúdo | Finalidade |
| --- | --- | --- |
| [`main`](https://github.com/frodsantana/projeto-integrado-II-III/tree/main) | React + TypeScript, Spring Boot/JPA e PostgreSQL | Projeto principal e desenvolvimento ativo. |
| [`prototipo`](https://github.com/frodsantana/projeto-integrado-II-III/tree/prototipo) | HTML, JavaScript, Tailwind via CDN e `localStorage` | Versão histórica para consulta. |

Este README explica como executar e usar a `main`. Para abrir o protótipo em uma cópia de trabalho separada, execute na raiz do repositório:

```powershell
git fetch origin
git worktree add --detach ../projeto-integrado-prototipo origin/prototipo
```

Abra `../projeto-integrado-prototipo/index.html` com um servidor estático, como a extensão Live Server do VS Code. Para remover essa cópia depois de fechar o servidor:

```powershell
git worktree remove ../projeto-integrado-prototipo
```

As branches não transportam dados do navegador ou do PostgreSQL entre versões. O desenvolvimento contínuo deve partir da `main`.

## O que o sistema permite fazer

- **Administrador:** cadastrar e editar cursos, matérias, coordenadores, professores e salas; consultar vínculos por curso e coordenador; importar um backup antigo com prévia.
- **Coordenador:** organizar aulas, repetir semanalmente, editar uma aula ou sua série, publicar o cronograma e filtrar aulas. O sistema sinaliza a disponibilidade de salas para a data e o horário informados.
- **Professor:** consultar aulas publicadas de seus cursos e alterar a sala ou a situação da aula.
- **Aluno:** acessar sem CPF e senha, escolher curso, semestre e período, consultar a semana atual ou outro mês e ver notificações da semana.

Ao cadastrar um curso, o sistema cria turmas iniciais para seus semestres. Professores e coordenadores podem ser vinculados a mais de um curso. Conflitos de horário, publicação e alterações são tratados pela API.

## Requisitos

- Java 17.
- Node.js 22.22 ou superior compatível e npm.
- PostgreSQL 18 ou Docker Desktop para executar o PostgreSQL pelo Compose.
- PowerShell para os scripts `run.ps1` descritos abaixo. Os comandos do Maven Wrapper também estão disponíveis diretamente.

## Iniciar pela primeira vez

Os exemplos a seguir usam PowerShell. Abra dois terminais na pasta raiz do projeto.

### 1. Configurar o banco e iniciar a API

Na primeira execução, crie seu arquivo de configuração a partir do exemplo:

```powershell
Copy-Item backend/.env.example backend/.env
```

Edite `backend/.env` e substitua `DB_PASSWORD` e `ADMIN_PASSWORD` por valores privados. A senha do administrador deve ter pelo menos 12 caracteres. O CPF inicial é `99999999999`; você pode alterá-lo por `ADMIN_CPF` antes da primeira inicialização.

Na mesma sessão do PowerShell, inicie o PostgreSQL pelo Docker Compose e o backend:

```powershell
cd backend
docker compose up -d
.\run.ps1
```

O Compose publica o PostgreSQL somente no computador local, na porta **5433**, e mantém os dados no volume `academico_data`. Não remova esse volume se quiser preservar os dados. A API fica disponível em `http://localhost:8080/api`.

Na inicialização, o Flyway aplica as migrações pendentes. Uma delas cria as salas padrão: **101–119**, **201–219**, **301–319**, **401–419** e **Lab1–Lab6**. Salas já cadastradas são mantidas. O administrador inicial só é criado quando ainda não existe uma conta de administrador; alterar a senha no `.env` não redefine uma senha existente.

Se você já possui `backend/.env`, mantenha-o e confira apenas se `DB_URL` aponta para o banco correto. Não copie o exemplo sobre sua configuração atual. Para um PostgreSQL instalado diretamente, ajuste `DB_URL`, `DB_USER` e `DB_PASSWORD` conforme sua instalação; não é necessário iniciar o Compose.

### 2. Iniciar a interface

No segundo terminal, a partir da raiz do repositório:

```powershell
cd frontend
npm ci
npm run dev
```

Abra **http://127.0.0.1:5173**. O Vite encaminha `/api` para a API na porta 8080. Se você mudar a porta da API, defina `API_PROXY_TARGET` no terminal antes de iniciar o Vite.

Também é possível iniciar a interface pelo script, a partir da raiz:

```powershell
.\frontend\run.ps1
```

O script instala as dependências com `npm ci` caso ainda não exista a pasta `node_modules`.

> Não envie os arquivos `.env` ao GitHub. Não coloque senhas ou outros segredos em variáveis `VITE_*`; esses valores ficam públicos no frontend compilado.

## Primeiro uso e fluxo por perfil

1. Entre como administrador usando `ADMIN_CPF` e `ADMIN_PASSWORD` definidos antes de criar a conta inicial.
2. Cadastre o curso, matérias, professores e coordenadores. Vincule professores e coordenadores aos cursos. As salas padrão já estarão disponíveis; cadastre outras somente quando necessário.
3. Saia e entre com a conta do coordenador. Escolha o curso, clique em **Adicionar Aula** e informe matéria, professor, turma, data, horários e sala. A data aparece como `DD/MM/AAAA`; os horários usam 24 horas.
4. Salve a aula como rascunho. Se necessário, marque a repetição semanal. A lista da sala mostra se ela está disponível ou ocupada na data e faixa de horário informadas.
5. Para corrigir aulas, escolha **Somente esta aula** ou **Todas as aulas desta série**. Ao finalizar o cronograma, clique em **Publicar Cronograma**.
6. Entre como professor para consultar as aulas publicadas. A visualização **Semestre inteiro** usa uma lista compacta; **Semana atual** mantém a grade semanal. O professor pode alterar a sala e marcar a aula como confirmada ou cancelada.
7. Na tela de login, escolha **Entrar como aluno**. O aluno seleciona o curso, o semestre e **Matutino** ou **Noturno**, depois consulta a semana atual ou seleciona um mês. As notificações correspondem à semana selecionada.

Use **Atualizar aulas** no acesso do aluno para buscar mudanças recentes. A aplicação não atualiza o cronograma em tempo real.

O calendário padrão é **03/08/2026 a 18/12/2026**. São aceitos dias úteis, no período matutino (**08:00–11:50**) ou noturno (**19:00–22:50**), com término posterior ao início. Para ajustar o calendário, altere `SEMESTER_START` e `SEMESTER_END` no `.env` e reinicie a API.

## Dados, sessões e importação

- Os cadastros e cronogramas ficam no PostgreSQL. A versão nova não lê nem apaga automaticamente os dados antigos do `localStorage`.
- As sessões de usuário ficam em memória no navegador. Recarregar a página pede novo login; sair revoga o token. Senhas são armazenadas no backend com BCrypt.
- O administrador pode importar backups produzidos pelo protótipo. A prévia não grava alterações; a confirmação é aplicada de forma atômica. Senhas antigas não são importadas, e contas novas precisam de uma senha definida durante a importação.
- Mantenha backups do PostgreSQL e dos arquivos de backup importados em local seguro. O volume Docker não substitui uma cópia de segurança.

## Testes e documentação técnica

Os testes de integração do backend e os testes de navegador criam registros. Execute-os **apenas em um banco PostgreSQL isolado**, com nome terminado em `_test`; eles não devem usar o banco da aplicação.

```powershell
cd frontend
npm test
npm run build
npm run test:e2e
```

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd -DskipTests package
```

Consulte [como configurar e executar os testes](docs/TESTES.md) antes dos testes que acessam a API e o PostgreSQL.

- [Arquitetura](docs/ARQUITETURA.md)
- [Fluxogramas](docs/FLUXOGRAMAS.md)
- [API, configuração e endpoints](backend/README.md)
- [Instruções de testes](docs/TESTES.md)

## Estrutura

```text
frontend/   Interface React, TypeScript, componentes e testes
backend/    API Spring Boot, módulos JPA e migrações Flyway
docs/       Arquitetura, fluxogramas e instruções de validação
```

## Gerar o build

O frontend gera os arquivos estáticos em `frontend/dist`. A API gera o arquivo JAR em `backend/target`:

```powershell
cd frontend
npm run build
cd ../backend
.\mvnw.cmd -DskipTests package
```

Para publicar em produção, hospede o frontend com HTTPS, encaminhe as requisições `/api` ao backend e configure o servidor estático para servir `index.html` nas rotas React. O proxy do Vite serve apenas ao desenvolvimento. Recuperação de senha, limitação de tentativas e implantação em produção não estão incluídas nesta versão.
