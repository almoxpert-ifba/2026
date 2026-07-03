# AlmoXpert

> Sistema de gerenciamento de almoxarifado desenvolvido como TCC para o **IFBA**. Controle completo de inventário, entradas de materiais, requisições de alunos e auditoria de movimentações.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Como Executar](#como-executar)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Reference](#api-reference)
- [Autenticação e Autorização](#autenticação-e-autorização)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Banco de Dados e Migrações](#banco-de-dados-e-migrações)
- [Atomicidade e Controle de Concorrência](#atomicidade-e-controle-de-concorrência)
- [LGPD](#lgpd)
- [E-mails](#e-mails)
- [Build e Produção](#build-e-produção)
- [Troubleshooting](#troubleshooting)

---

## Visão Geral

AlmoXpert é um sistema **full-stack** de almoxarifado com:

- **Gestão de Usuários** — Administradores e alunos com controle de acesso (RBAC), criação, edição e remoção
- **Catálogo de Itens** — Itens com variações, tamanhos e unidades de medida
- **Controle de Estoque** — Rastreamento em tempo real com alertas de estoque mínimo
- **Remessas** — Registro de entradas de materiais; estoque atualizado apenas na conclusão
- **Pedidos** — Solicitações de alunos com fluxo de aprovação editável e entrega
- **Movimentações** — Auditoria completa de todas as entradas e saídas
- **Atomicidade e Concorrência** — Operações de estoque transacionais com lock pessimista contra condições de corrida
- **Importação em Massa** — Criação de alunos via planilha Excel
- **E-mails Automáticos** — Boas-vindas, redefinição de senha, revisão e entrega de pedidos
- **LGPD** — Portabilidade de dados, termos de uso, preferência de e-mails e limpeza automática de tokens
- **Segurança** — JWT + bcrypt, roles admin/aluno, logs anonimizados

---

## Tecnologias

### Backend (`apps/api`)

| Tecnologia | Versão | Uso |
|---|---|---|
| NestJS | 10.x | Framework principal |
| TypeORM | 0.3.x | ORM / query builder |
| MySQL | 8.0 | Banco de dados |
| Passport.js + JWT | — | Autenticação |
| bcrypt | — | Hash de senhas |
| Nodemailer | — | Envio de e-mails |
| Swagger/OpenAPI | — | Documentação interativa |
| TypeScript | 5.x | Linguagem |

### Frontend (`apps/web`)

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 19.x | UI |
| Vite | 8.x | Build / dev server |
| React Router | 7.x | Roteamento |
| TanStack Query | 5.x | Cache / data fetching |
| Zustand | 5.x | Estado global |
| React Hook Form + Zod | — | Formulários e validação |
| Tailwind CSS | 3.x | Estilização |
| Lucide React | — | Ícones |
| TypeScript | 6.x | Linguagem |

### Infra

- **Docker & Docker Compose** — Containerização
- **Yarn Workspaces** — Monorepo
- **MySQL EVENT SCHEDULER** — Limpeza automática de tokens expirados

---

## Requisitos

- **Node.js** >= 18.x
- **Yarn** >= 3.x
- **Docker & Docker Compose** (recomendado para o banco de dados)
- **MySQL 8.0+** (alternativa ao Docker)

---

## Instalação e Configuração

### 1. Clonar

```bash
git clone <url-do-repositorio>
cd ifba-almoxpert
```

### 2. Instalar dependências

```bash
yarn install
```

### 3. Configurar variáveis de ambiente

**API:**
```bash
cp apps/api/.env.example apps/api/.env
# Edite apps/api/.env com suas credenciais
```

**Web:**
```bash
cp apps/web/.env.example apps/web/.env
# Padrão: VITE_API_URL=http://localhost:3000
```

### 4. Subir o banco de dados

**Com Docker (recomendado):**
```bash
docker-compose -f docker-compose.dev.yml up -d db
```

**MySQL local:**
```bash
mysql -u root -p < database/init.sql
```

---

## Como Executar

### Desenvolvimento

```bash
yarn dev:all   # API + Web simultaneamente
```

Ou separadamente:

```bash
yarn dev        # API em http://localhost:3000
yarn dev:web    # Web em http://localhost:5173
```

Swagger disponível em: **http://localhost:3000/api/docs**

### Produção com Docker

```bash
docker-compose up -d

docker-compose logs -f   # acompanhar logs
docker-compose down      # parar tudo
docker-compose down -v   # parar e apagar volumes (⚠️ apaga dados do banco)
```

---

## Estrutura do Projeto

```
ifba-almoxpert/
├── apps/
│   ├── api/                          # NestJS — Backend REST
│   │   └── src/
│   │       ├── auth/                 # Login, JWT, troca de senha, preferências, LGPD
│   │       ├── users/                # Usuários, perfis, importação, e-mail de boas-vindas
│   │       ├── items/                # Itens e variações do catálogo
│   │       ├── stock/                # Controle de estoque
│   │       ├── shipments/            # Remessas (entradas de material)
│   │       ├── orders/               # Pedidos de alunos
│   │       ├── movements/            # Auditoria de movimentações
│   │       ├── email/                # Templates HTML e envio de e-mails
│   │       ├── common/               # Guards, decorators, filtros
│   │       └── health/               # Health check
│   │
│   └── web/                          # React + Vite — Frontend
│       └── src/
│           ├── components/
│           │   ├── layout/           # Header, Sidebar, AppLayout
│           │   ├── modals/           # ItemModal (componente compartilhado)
│           │   └── ui/               # Button, Input, Table, Modal, Toast, FilterBar, ComboBox...
│           ├── pages/
│           │   ├── auth/             # Login, Esqueci a senha, Redefinir senha
│           │   ├── dashboard/
│           │   ├── items/
│           │   │   └── modals/       # (via ItemModal compartilhado)
│           │   ├── stock/
│           │   │   └── modals/       # StockMinModal
│           │   ├── shipments/
│           │   │   └── modals/       # ShipmentFormModal, ShipmentViewModal
│           │   ├── orders/
│           │   │   └── modals/       # OrderViewModal, OrderCreateModal
│           │   ├── movements/
│           │   ├── users/
│           │   │   └── modals/       # UserFormModal, UserImportModal
│           │   └── ProfilePage.tsx   # Perfil, senha, exportação, notificações
│           ├── services/             # Axios — chamadas à API (barrel em index.ts)
│           ├── store/                # Zustand (auth)
│           ├── types/                # Tipos TypeScript
│           └── utils/                # Formatadores, helpers
│
├── database/
│   ├── init.sql                      # Schema completo + dados iniciais
│   ├── migration_v2.sql              # Adiciona sizeType / size
│   ├── migration_v3.sql              # variation_id nullable
│   ├── migration_v4.sql
│   ├── migration_v5.sql
│   ├── migration_v6.sql              # Adiciona receive_emails
│   ├── migration_v7.sql              # Adiciona terms_accepted_at
│   ├── migration_v8.sql              # Remove intake_forms/barem_score + EVENT de limpeza
│   └── migration_v9.sql              # Corrige variation_id para itens sem variação
│
├── docs/
│   └── API.md                        # Referência completa da API
│
├── docker-compose.yml                # Produção
├── docker-compose.dev.yml            # Desenvolvimento
├── package.json                      # Workspaces Yarn + scripts raiz
└── tsconfig.json
```

---

## API Reference

Base URL: `http://localhost:3000`
Documentação interativa: `http://localhost:3000/api/docs`

### Health Check

```
GET  /health
```

### Autenticação

```
POST   /auth/login                # Login — retorna JWT
POST   /auth/forgot-password      # Envia código de redefinição por e-mail
POST   /auth/reset-password       # Redefine senha com código
PATCH  /auth/change-password      # Altera senha (autenticado)
PATCH  /auth/preferences          # Atualiza preferência de e-mails
PATCH  /auth/accept-terms         # Registra aceite dos Termos de Uso
GET    /auth/me                   # Perfil completo do usuário autenticado
GET    /auth/me/export            # Exporta dados do titular (LGPD art. 18)
```

### Usuários `(Admin)`

```
GET    /users                          # Listar (paginado + filtros)
GET    /users/:id                      # Buscar por ID
POST   /users                          # Criar (envia e-mail de boas-vindas)
PATCH  /users/:id                      # Atualizar
DELETE /users/:id                      # Remover permanentemente
PATCH  /users/:id/deactivate           # Desativar conta
POST   /users/:id/reset-password       # Resetar senha para o padrão
POST   /users/import                   # Importar alunos via Excel
GET    /users/import/template          # Baixar planilha modelo
```

### Itens

```
GET    /items                               # Listar (todos leem)
GET    /items/:id                           # Buscar por ID
POST   /items                              # Criar (Admin)
PATCH  /items/:id                          # Atualizar (Admin)
PATCH  /items/:id/toggle                   # Ativar / desativar (Admin)
DELETE /items/:id                          # Excluir (Admin) — só se não estiver em uso (estoque/pedidos/remessas)
POST   /items/:id/variations               # Adicionar variação (Admin)
PATCH  /items/:id/variations/:varId/toggle # Ativar / desativar variação (Admin)
DELETE /items/:id/variations/:varId        # Excluir variação (Admin) — só se não estiver em uso (estoque/pedidos/remessas)
```

> **Regra de modelagem (validada no backend):** as dimensões da chave de estoque `(item, variação, tamanho)` são fixadas na criação. Não é possível adicionar variações a um item criado com `hasVariations: false`, nem alterar `hasVariations`/`sizeType` depois — isso invalidaria o estoque existente. Adicionar mais variações só é permitido em itens criados como "de variação". A **exclusão** (`DELETE /items/:id`) — e a de variação (`DELETE /items/:id/variations/:varId`) — só é permitida se o alvo **não estiver em uso**: sem estoque/movimentações **e** não vinculado a nenhum **pedido** ou **remessa**. Caso contrário, use a **desativação** para preservar o histórico.

### Estoque `(Admin)`

```
GET    /stock                                     # Listar completo
GET    /stock/low                                 # Itens com estoque baixo
GET    /stock/:itemId/:variationId/:size          # Entrada única
PATCH  /stock/:itemId/:variationId/:size/minimum  # Atualizar quantidade mínima
```

### Remessas `(Admin)`

```
GET    /shipments                      # Listar (paginado + filtros)
GET    /shipments/:id                  # Buscar por ID
POST   /shipments                      # Criar remessa
PATCH  /shipments/:id                  # Editar remessa aberta
DELETE /shipments/:id                  # Excluir remessa aberta
PATCH  /shipments/:id/complete         # Concluir → lança no estoque
PATCH  /shipments/:id/cancel           # Cancelar
```

### Pedidos

```
GET    /orders                         # Admin: todos | Aluno: os seus
GET    /orders/:id
POST   /orders                         # Criar pedido (Aluno)
PATCH  /orders/:id/review              # Aprovar / rejeitar com edição por item (Admin)
PATCH  /orders/:id/deliver             # Marcar como entregue + e-mail (Admin)
```

### Movimentações `(Admin)`

```
GET    /movements                      # Auditoria completa (paginado + filtros)
GET    /movements/item/:itemId         # Movimentações de um item
```

### Parâmetros de paginação

```
?pageIndex=0        # Página base 0 (padrão: 0)
?pageSize=25        # Itens por página (padrão: 25)
?sortBy=createdAt   # Campo de ordenação
?sortOrder=DESC     # ASC ou DESC
```

---

## Autenticação e Autorização

### Login

```bash
POST /auth/login
{
  "email": "admin@ifba.edu.br",
  "password": "suaSenha"
}
```

### Resposta

```json
{
  "accessToken": "eyJhbGci...",
  "mustChangePassword": false,
  "mustAcceptTerms": false,
  "user": {
    "id": 1,
    "name": "System Administrator",
    "email": "admin@ifba.edu.br",
    "userType": "admin"
  }
}
```

### Uso nas requisições

```
Authorization: Bearer <accessToken>
```

### Roles

| Role | Permissões |
|---|---|
| `admin` | Acesso total — gerencia estoque, usuários, remessas e aprova pedidos |
| `student` | Cria pedidos, visualiza itens e seus próprios pedidos e perfil |

---

## Variáveis de Ambiente

### `apps/api/.env`

```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_USER=almoxpert
DB_PASSWORD=almoxpert
DB_NAME=almoxpert

# JWT
JWT_SECRET=troque-por-uma-chave-forte-com-32-caracteres-minimo
JWT_EXPIRES_IN=7d

# Servidor
PORT=3000

# E-mail (opcional — sem config os e-mails são logados no console em dev)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=senha
SMTP_FROM="AlmoXpert <noreply@example.com>"
```

> Em produção use uma `JWT_SECRET` forte (mínimo 32 caracteres aleatórios) e credenciais de banco dedicadas.

### `apps/web/.env`

```env
VITE_API_URL=http://localhost:3000
```

---

## Banco de Dados e Migrações

O projeto usa `synchronize: false` — o schema é gerenciado manualmente via SQL.

### Inicialização do zero

```bash
# MySQL local
mysql -u root -p < database/init.sql

# Via Docker
docker exec -i almoxpert_db_dev mysql -u root -prootpass < database/init.sql
```

### Aplicar migrações em banco existente

```bash
# v6-v7: credenciais de usuário
docker exec almoxpert_db_dev mysql -u almoxpert -palmoxpert almoxpert < database/migration_v6.sql
docker exec almoxpert_db_dev mysql -u almoxpert -palmoxpert almoxpert < database/migration_v7.sql

# v8: requer root (SET GLOBAL event_scheduler)
docker exec almoxpert_db_dev mysql -u root -prootpass < database/migration_v8.sql

# v9: corrige variation_id (requer root para DROP FK)
Get-Content database/migration_v9.sql | docker exec -i almoxpert_db_dev mysql -u root -prootpass
```

| Migração | Conteúdo |
|---|---|
| `migration_v2.sql` | Adiciona `sizeType` / `size` a itens, remessas e pedidos |
| `migration_v3.sql` | `variation_id` nullable em todas as tabelas |
| `migration_v4.sql` | Ajustes adicionais de schema |
| `migration_v5.sql` | Ajustes adicionais de schema |
| `migration_v6.sql` | Adiciona `receive_emails` à tabela `users` |
| `migration_v7.sql` | Adiciona `terms_accepted_at` à tabela `users` |
| `migration_v8.sql` | Remove `intake_forms` e `barem_score` de `students`; EVENT de limpeza semanal de tokens |
| `migration_v9.sql` | Corrige `variation_id = NULL` para itens sem variação (Camiseta, Tênis, Borracha) |

---

## Atomicidade e Controle de Concorrência

As operações que alteram o estoque e geram a trilha de auditoria são **transacionais**. Cada baixa/entrada de estoque, o respectivo movimento e a mudança de status são gravados dentro de uma única transação (`DataSource.transaction`, com o `DataSource` injetado via `@InjectDataSource()`): uma falha no meio do laço sofre *rollback* completo, então nunca existe estado parcialmente aplicado (ex.: estoque debitado sem o movimento correspondente registrado).

Para evitar **condições de corrida** (dois processos lendo o mesmo saldo e ambos debitando), a leitura da linha de estoque dentro da transação adquire um **lock pessimista de escrita** (`SELECT ... FOR UPDATE`). Isso serializa mutações concorrentes sobre o mesmo item e impede que o disponível fique negativo / haja baixa além do estoque.

| Operação | Escrita atômica | Lock de estoque |
|---|---|---|
| `PATCH /orders/:id/deliver` | Baixa de estoque + movimento `OUT` + status `delivered` | Pessimista (`FOR UPDATE`) |
| `PATCH /shipments/:id/complete` | Entrada de estoque + movimento `IN` + status `completed` | Pessimista (`FOR UPDATE`) |
| `POST /orders` · `PATCH /orders/:id/review` | Cabeçalho + itens / ajustes de quantidade | — (não toca estoque) |
| `POST` · `PATCH` · `DELETE /shipments/:id` | Cabeçalho + substituição de itens | — (não toca estoque) |

Notas de projeto:

- **E-mails** são disparados **após** o commit (fire-and-forget), nunca dentro da transação — uma falha de SMTP não desfaz a baixa de estoque.
- **Sem mudança de schema**: a estratégia é puramente de aplicação sobre o InnoDB; nenhuma migração é necessária.
- O isolamento padrão do MySQL (`REPEATABLE READ`) somado ao lock de linha garante a serialização apenas das transações que disputam o **mesmo** item, preservando a concorrência entre itens distintos.

---

## LGPD

O sistema implementa as seguintes medidas de conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018):

| Medida | Implementação |
|---|---|
| **Termos de Uso** | Modal na primeira sessão, aceite registrado com timestamp (`terms_accepted_at`) |
| **Portabilidade** | `GET /auth/me/export` — JSON com perfil completo e histórico de pedidos |
| **Preferência de e-mails** | Campo `receive_emails`; e-mails somente enviados se `true` |
| **Anonimização em logs** | E-mails mascarados (ex: `jo***@ifba.edu.br`) em logs de erro e dev |
| **Sem credenciais em logs** | Senhas e códigos de reset nunca aparecem no console |
| **Retenção de tokens** | EVENT MySQL remove tokens usados com mais de 30 dias semanalmente |
| **Coleta mínima** | Campos `intake_forms` e `barem_score` removidos (Art. 13) |

---

## E-mails

O sistema envia e-mails automaticamente nos seguintes eventos:

| Evento | Template | Gatilho |
|---|---|---|
| Criação de usuário | Boas-vindas com credenciais | `POST /users` |
| Esqueci a senha | Código de 6 dígitos (expira em 15 min) | `POST /auth/forgot-password` |
| Reset de senha pelo admin | Nova senha temporária | `POST /users/:id/reset-password` |
| Revisão de pedido | Status + itens aprovados/recusados | `PATCH /orders/:id/review` |
| Entrega de pedido | Confirmação de entrega com itens | `PATCH /orders/:id/deliver` |

### Configuração

Configure as variáveis `SMTP_*` no `.env`. Sem elas, os e-mails são logados no console (modo dev) com e-mails mascarados.

### Templates

Todos os templates são HTML responsivos com:
- Ícones CSS puros (sem imagens externas)
- Logo do sistema via CID (inline attachment)
- Compatíveis com Gmail, Outlook, Apple Mail

---

## Build e Produção

```bash
yarn build      # Compila a API (NestJS → dist/)
yarn build:web  # Compila o frontend (Vite → apps/web/dist/)
```

```bash
docker-compose up -d          # Sobe todos os serviços
docker-compose logs -f api    # Acompanhar logs da API
docker-compose down           # Parar tudo
docker-compose down -v        # Parar e apagar volumes (⚠️ apaga dados)
```

---

## Troubleshooting

**Erro de conexão com MySQL**
```bash
docker-compose -f docker-compose.dev.yml ps
cat apps/api/.env
```

**Porta 3000 ou 5173 em uso**
```bash
netstat -ano | findstr :3000   # Windows
lsof -i :3000                  # Linux/macOS
```

**Dependências faltando**
```bash
yarn install
```

**TypeScript error no build**
```bash
rm -rf apps/api/dist apps/web/dist
yarn build
```

**Banco com schema desatualizado**
```bash
docker exec almoxpert_db_dev mysql -u almoxpert -palmoxpert almoxpert < database/migration_v6.sql
docker exec almoxpert_db_dev mysql -u almoxpert -palmoxpert almoxpert < database/migration_v7.sql
docker exec almoxpert_db_dev mysql -u root -prootpass almoxpert < database/migration_v8.sql
Get-Content database/migration_v9.sql | docker exec -i almoxpert_db_dev mysql -u root -prootpass
```

**E-mails não enviados**
- Em dev sem SMTP configurado os e-mails são logados no console (comportamento esperado).
- Configure as variáveis `SMTP_*` no `.env` para envio real.

---

## Documentação Adicional

- **[Swagger UI](http://localhost:3000/api/docs)** — Documentação interativa da API
- **[docs/API.md](./docs/API.md)** — Referência completa de todos os endpoints REST
- **[docs/FRONTEND.md](./docs/FRONTEND.md)** — Arquitetura, componentes, fluxos e convenções do frontend
- **[database/init.sql](./database/init.sql)** — Schema completo do banco

---

**Versão:** 1.4.0 | **Última atualização:** Junho de 2026 | IFBA — Trabalho de Conclusão de Curso
