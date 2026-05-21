# AlmoXpert 📦

> Sistema de gerenciamento de almoxarifado desenvolvido como TCC para o **IFBA**. Controle completo de inventário, entradas de materiais, requisições de alunos e auditoria de movimentações.

---

## 📋 Sumário

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
- [Build e Produção](#build-e-produção)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

AlmoXpert é um sistema **full-stack** de almoxarifado com:

- **👥 Gestão de Usuários** — Administradores e alunos com controle de acesso (RBAC)
- **📦 Catálogo de Itens** — Itens com variações, tamanhos e unidades de medida
- **📊 Controle de Estoque** — Rastreamento em tempo real com alertas de estoque mínimo
- **📥 Remessas** — Registro de entradas de materiais; estoque atualizado apenas na conclusão
- **📋 Pedidos** — Solicitações de alunos com fluxo de aprovação e entrega
- **📝 Movimentações** — Auditoria completa de todas as entradas e saídas
- **🔐 Segurança** — JWT + bcrypt, roles admin/aluno

---

## 🛠️ Tecnologias

### Backend (`apps/api`)
| Tecnologia | Versão | Uso |
|---|---|---|
| [NestJS](https://nestjs.com/) | 10.x | Framework principal |
| [TypeORM](https://typeorm.io/) | 0.3.x | ORM / query builder |
| [MySQL](https://www.mysql.com/) | 8.0 | Banco de dados |
| [Passport.js](http://www.passportjs.org/) + JWT | — | Autenticação |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | — | Hash de senhas |
| [Swagger/OpenAPI](https://swagger.io/) | — | Documentação da API |
| TypeScript | 5.x | Linguagem |

### Frontend (`apps/web`)
| Tecnologia | Versão | Uso |
|---|---|---|
| [React](https://react.dev/) | 19.x | UI |
| [Vite](https://vitejs.dev/) | 8.x | Build / dev server |
| [React Router](https://reactrouter.com/) | 7.x | Roteamento |
| [TanStack Query](https://tanstack.com/query) | 5.x | Cache / fetching |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5.x | Estado global |
| [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | — | Formulários e validação |
| [Tailwind CSS](https://tailwindcss.com/) | 3.x | Estilização |
| [Lucide React](https://lucide.dev/) | — | Ícones |
| TypeScript | 6.x | Linguagem |

### Infra
- **Docker & Docker Compose** — Containerização
- **Yarn Workspaces** — Monorepo

---

## ✅ Requisitos

- **Node.js** >= 18.x
- **Yarn** >= 3.x
- **Docker & Docker Compose** (recomendado para o banco de dados)
- **MySQL 8.0+** (alternativa ao Docker)

```bash
node --version   # >= 18
yarn --version   # >= 3
docker --version # opcional
```

---

## 📦 Instalação e Configuração

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
# Copie o arquivo de exemplo de dev e configure as credenciais locais
cp docker-compose.dev.yml.example docker-compose.dev.yml

docker-compose -f docker-compose.dev.yml up -d
```

**MySQL local:**
```bash
mysql -u root -p < database/init.sql
```

---

## 🚀 Como Executar

### Desenvolvimento (ambos simultaneamente)

```bash
yarn dev:all
```

Ou separadamente:

```bash
yarn dev        # API em http://localhost:3000
yarn dev:web    # Web em http://localhost:5173
```

Swagger disponível em: **http://localhost:3000/api/docs**

### Produção com Docker

```bash
# Variáveis de ambiente devem estar configuradas em .env na raiz
docker-compose up -d

# Logs
docker-compose logs -f

# Parar
docker-compose down
```

---

## 📁 Estrutura do Projeto

```
ifba-almoxpert/
├── apps/
│   ├── api/                          # NestJS — Backend REST
│   │   ├── src/
│   │   │   ├── auth/                 # Login, estratégia JWT
│   │   │   ├── users/                # Usuários (admin + perfis de aluno)
│   │   │   ├── items/                # Itens e variações do catálogo
│   │   │   ├── stock/                # Controle de estoque
│   │   │   ├── shipments/            # Remessas (entradas de material)
│   │   │   ├── orders/               # Pedidos de alunos
│   │   │   ├── movements/            # Auditoria de movimentações
│   │   │   ├── common/               # Guards, decorators, filtros
│   │   │   ├── health/               # Health check
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── Dockerfile
│   │   ├── .env.example              # ← copie para .env e configure
│   │   └── package.json
│   │
│   └── web/                          # React + Vite — Frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── layout/           # Header, Sidebar
│       │   │   ├── modals/           # ItemModal, etc.
│       │   │   └── ui/               # Button, Table, Badge, FilterBar, Modal...
│       │   ├── pages/
│       │   │   ├── auth/             # Login
│       │   │   ├── dashboard/
│       │   │   ├── items/
│       │   │   ├── stock/
│       │   │   ├── shipments/
│       │   │   ├── orders/
│       │   │   ├── movements/
│       │   │   └── users/
│       │   ├── services/             # Axios — chamadas à API
│       │   ├── store/                # Zustand (auth)
│       │   ├── types/                # Tipos TypeScript compartilhados
│       │   └── utils/                # Formatadores, helpers
│       ├── Dockerfile
│       ├── .env.example              # ← copie para .env e configure
│       └── package.json
│
├── database/
│   ├── init.sql                      # Schema inicial completo
│   ├── migration_v2.sql              # Adiciona campo size / sizeType
│   └── migration_v3.sql              # Torna variation_id nullable
│
├── docs/
│   └── API.md                        # Referência detalhada da API
│
├── docker-compose.yml                # Produção (usa variáveis do .env)
├── docker-compose.dev.yml.example    # Exemplo de configuração de dev ← NÃO commitar o .yml
├── package.json                      # Workspaces Yarn + scripts raiz
├── tsconfig.json
└── README.md
```

> ⚠️ `docker-compose.dev.yml` está no `.gitignore` pois pode conter credenciais locais. Use `.example` como base.

---

## 🔌 API Reference

Base URL: `http://localhost:3000`  
Documentação interativa: `http://localhost:3000/api/docs`

### Health Check
```
GET  /health
```

### Autenticação
```
POST /auth/login
```

### Usuários `(Admin)`
```
GET    /users                          # Listar (paginado + filtros)
GET    /users/:id                      # Buscar por ID
POST   /users                          # Criar
PATCH  /users/:id                      # Atualizar
PATCH  /users/:id/deactivate           # Desativar conta
```

### Itens
```
GET    /items                          # Listar (todos leem)
GET    /items/:id                      # Buscar por ID
POST   /items                          # Criar (Admin)
PATCH  /items/:id                      # Atualizar (Admin)
PATCH  /items/:id/toggle               # Ativar / desativar (Admin)
POST   /items/:id/variations           # Adicionar variação (Admin)
PATCH  /items/:id/variations/:varId/toggle  # Ativar / desativar variação (Admin)
```

### Estoque `(Admin)`
```
GET    /stock                          # Listar completo
GET    /stock/low                      # Somente itens com estoque baixo
GET    /stock/:itemId/:variationId/:size
PATCH  /stock/:itemId/:variationId/:size/minimum
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
PATCH  /orders/:id/review              # Aprovar / rejeitar (Admin)
PATCH  /orders/:id/deliver             # Marcar como entregue (Admin)
```

### Movimentações `(Admin)`
```
GET    /movements                      # Auditoria completa (paginado + filtros)
GET    /movements/item/:itemId         # Movimentações de um item
```

### Parâmetros de paginação (todos os GETs de listagem)

```
?pageIndex=0        # Página, base 0 (padrão: 0)
?pageSize=25        # Itens por página (padrão: 25)
?sortBy=createdAt   # Campo de ordenação
?sortOrder=DESC     # ASC ou DESC
```

### Filtros por endpoint

| Endpoint | Filtros disponíveis |
|---|---|
| `/users` | `userType`, `name`, `isActive`, `createdFrom`, `createdTo`, `registrationNumber`, `course`, `position` |
| `/items` | `name`, `type`, `isActive` |
| `/stock` | `itemId`, `variationId`, `itemName` |
| `/shipments` | `status`, `responsibleId`, `dateFrom`, `dateTo` |
| `/orders` | `status`, `userId`, `userName`, `dateFrom`, `dateTo` |
| `/movements` | `itemId`, `variationId`, `movementType`, `originType`, `originId`, `itemName`, `dateFrom`, `dateTo` |

---

## 🔐 Autenticação e Autorização

### Login
```bash
POST /auth/login
{
  "email": "admin@ifba.edu.br",
  "password": "senha123"
}
```

### Resposta
```json
{
  "access_token": "eyJhbGci...",
  "user": { "id": 1, "email": "admin@ifba.edu.br", "userType": "admin" }
}
```

### Uso nas requisições
```
Authorization: Bearer <access_token>
```

### Roles
| Role | Permissões |
|---|---|
| `admin` | Acesso total — gerencia estoque, usuários, remessas e aprova pedidos |
| `student` | Cria pedidos, visualiza itens e seus próprios pedidos |

---

## 🌍 Variáveis de Ambiente

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
```

> ⚠️ Em produção use uma `JWT_SECRET` forte (mínimo 32 caracteres aleatórios) e credenciais de banco dedicadas.

### `apps/web/.env`

```env
VITE_API_URL=http://localhost:3000
```

---

## 🗄️ Banco de Dados e Migrações

O projeto usa `synchronize: false` — o schema é gerenciado manualmente via SQL.

### Inicialização do zero
```bash
mysql -u root -p < database/init.sql
```

### Aplicar migrações em banco existente
```bash
# Migração v2: adiciona sizeType e size aos itens/remessas/pedidos
mysql -u almoxpert -palmoxpert almoxpert < database/migration_v2.sql

# Migração v3: torna variation_id nullable (suporte a itens sem variação)
mysql -u almoxpert -palmoxpert almoxpert < database/migration_v3.sql
```

### Via Docker
```bash
docker exec -i almoxpert_db_dev mysql -u almoxpert -palmoxpert almoxpert < database/migration_v3.sql
```

---

## 🔨 Build e Produção

### Build completo
```bash
yarn build      # Compila a API (NestJS → dist/)
yarn build:web  # Compila o frontend (Vite → dist/)
```

### Docker Compose produção
```bash
# Configure as variáveis no .env da raiz antes de subir
docker-compose up -d

docker-compose logs -f api   # acompanhar logs
docker-compose down          # parar tudo
docker-compose down -v       # parar e apagar volumes (⚠️ apaga dados do banco)
```

---

## 🆘 Troubleshooting

**Erro de conexão com MySQL**
```bash
# Verifique se o container está saudável
docker-compose ps

# Verifique as credenciais no .env
cat apps/api/.env
```

**Porta 3000 ou 5173 em uso**
```bash
# Linux/macOS
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

**Dependências faltando após clonar**
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
# Aplique as migrações em ordem
mysql -u almoxpert -palmoxpert almoxpert < database/migration_v2.sql
mysql -u almoxpert -palmoxpert almoxpert < database/migration_v3.sql
```

---

## 📚 Documentação Adicional

- **[Swagger UI](http://localhost:3000/api/docs)** — Documentação interativa (requer servidor rodando)
- **[database/init.sql](./database/init.sql)** — Schema completo do banco
- **[docs/API.md](./docs/API.md)** — Referência detalhada da API

---

**Versão:** 1.1.0 | **Última atualização:** Maio de 2026 | IFBA — Trabalho de Conclusão de Curso
