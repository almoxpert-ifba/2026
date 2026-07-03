# AlmoXpert — Frontend Reference

Interface web do sistema de gestão de almoxarifado do IFBA.  
Localização: `apps/web/`

---

## Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | React | 19.x |
| Build | Vite | 8.x |
| Linguagem | TypeScript | 6.x |
| Estilos | Tailwind CSS | 3.x |
| Roteamento | React Router DOM | 7.x |
| Estado global | Zustand (com persistência) | 5.x |
| Formulários | React Hook Form + Zod | — |
| Data fetching | TanStack Query | 5.x |
| HTTP | Axios | — |
| Ícones | Lucide React | — |
| Datas | date-fns + locale ptBR | — |

---

## Estrutura de Diretórios

```
src/
├── types/
│   └── index.ts              # Todos os tipos TypeScript (DTOs, interfaces, enums)
│
├── services/                 # Camada de acesso à API
│   ├── api.ts                # Instância Axios + interceptor JWT + logout automático
│   ├── authService.ts        # Login, senha, preferências, exportação LGPD
│   ├── itemsService.ts       # Itens e variações
│   ├── stockService.ts       # Estoque
│   ├── shipmentsService.ts   # Remessas
│   ├── ordersService.ts      # Pedidos
│   ├── movementsService.ts   # Movimentações
│   ├── usersService.ts       # Usuários + importação + download de template
│   └── index.ts              # Barrel: re-exporta todos os serviços
│
├── store/
│   └── authStore.ts          # Zustand: token, user, mustChangePassword, mustAcceptTerms
│
├── utils/
│   ├── index.ts              # cn(), formatDate(), formatDateTime(), getInitials()
│   └── ...                   # orderStatusLabel, orderStatusColor, aidColor, etc.
│
├── hooks/                    # Custom hooks reutilizáveis
│
├── components/
│   ├── ui/                   # Componentes de base
│   │   ├── Button.tsx
│   │   ├── FormFields.tsx    # Input, Select, Textarea
│   │   ├── ComboBox.tsx      # Dropdown com busca, paginação infinita, portal
│   │   ├── Modal.tsx         # Modal base (header + body scroll + footer fixo)
│   │   ├── ConfirmModal.tsx  # Modal de confirmação com variantes de cor
│   │   ├── Table.tsx         # Tabela com colunas renderizáveis
│   │   ├── Pagination.tsx
│   │   ├── Badge.tsx
│   │   ├── FilterBar.tsx     # Barra de filtros colapsável
│   │   ├── StatCard.tsx      # Card de métrica
│   │   └── Toast.tsx         # Fila de notificações
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── AppLayout.tsx     # Gerencia sidebar mobile
│   └── modals/
│       └── ItemModal.tsx     # Modal de item (compartilhado entre páginas)
│
└── pages/
    ├── auth/
    │   ├── LoginPage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   └── ResetPasswordPage.tsx
    ├── dashboard/
    │   └── DashboardPage.tsx
    ├── items/
    │   └── ItemsPage.tsx
    ├── stock/
    │   ├── StockPage.tsx
    │   └── modals/
    │       └── StockMinModal.tsx
    ├── shipments/
    │   ├── ShipmentsPage.tsx
    │   └── modals/
    │       ├── ShipmentFormModal.tsx   # create + edit (unificado)
    │       └── ShipmentViewModal.tsx
    ├── orders/
    │   ├── OrdersPage.tsx
    │   └── modals/
    │       ├── OrderViewModal.tsx      # visualização + revisão editável
    │       └── OrderCreateModal.tsx   # criação (admin seleciona aluno)
    ├── movements/
    │   └── MovementsPage.tsx
    ├── users/
    │   ├── UsersPage.tsx
    │   ├── UserFilters.tsx
    │   └── modals/
    │       ├── UserFormModal.tsx       # create + edit (mode prop)
    │       └── UserImportModal.tsx    # importação em 3 etapas
    └── ProfilePage.tsx
```

---

## Autenticação

### Fluxo de Login

1. `POST /auth/login` → retorna `{ accessToken, mustChangePassword, mustAcceptTerms, user }`
2. Token armazenado no Zustand com persistência em `localStorage` (chave `almoxpert_token`)
3. `authStore` também persiste `mustChangePassword` e `mustAcceptTerms`

### Interceptor Axios (`services/api.ts`)

- Injeta `Authorization: Bearer <token>` em todas as requisições
- Em resposta `401`: limpa o store e redireciona para `/login`

### Primeiro Acesso

| Flag | Comportamento |
|---|---|
| `mustChangePassword: true` | Usuário bloqueado na `/profile` até trocar a senha via `PATCH /auth/change-password` |
| `mustAcceptTerms: true` | `TermsModal` sobrepõe toda a interface; aceite chama `PATCH /auth/accept-terms` |

### Recuperação de Senha (sem login)

Rota pública em `/forgot-password` → `/reset-password`:
1. Usuário informa e-mail → recebe código de 6 dígitos por e-mail
2. Informa código + nova senha

---

## RBAC (Controle de Acesso)

O `userType` do token JWT controla quais menus e rotas são exibidos.

| Seção | Admin | Aluno |
|---|---|---|
| Dashboard | Sim | Não |
| Itens | Sim (CRUD completo) | Não |
| Estoque | Sim | Não |
| Remessas | Sim | Não |
| Pedidos | Sim (todos + criar p/ aluno) | Sim (apenas os seus) |
| Movimentações | Sim | Não |
| Usuários | Sim | Não |
| Perfil | Sim | Sim |

Filtros também são condicionados por role (ex.: filtro "Solicitante" só aparece para admin na tela de Pedidos).

---

## Layout (`components/layout/`)

### Header

- Avatar com as iniciais do usuário no canto direito — é um `<Link to="/profile">`, clicável
- Botão de sino (notificações) — reservado para futura implementação

### Sidebar / Logout

- Rodapé do sidebar exibe avatar + nome do usuário como `<NavLink to="/profile">`
- Botão "Sair" abre um `ConfirmModal` antes de executar o logout:
  - **Confirmar** → `authStore.logout()` + `navigate('/login')`
  - **Cancelar** → fecha o modal sem ação

---

## Padrão de Modais

Cada tela tem seus modais em `pages/<tela>/modals/`. Regras:

- **Estado de formulário** (`useForm`, `useFieldArray`, Zod) encapsulado dentro do modal
- **Botões fixos no rodapé** via prop `footer` do componente `Modal` base
- **Submit fora do `<form>`**: botão usa `form="form-id"` e o `<form>` tem o `id` correspondente
- **Callbacks**: modal recebe `onSave(dto)`, `onClose()`, `loading` — mutations ficam na página pai
- **Create + Edit unificado**: prop `mode: 'create' | 'edit'` ou objeto opcional (`shipment?: Shipment | null`)

### Estrutura do componente `Modal`

```
Modal
├── Header (fixo)   — título, subtítulo, ícone, botão fechar
├── Body   (scroll) — conteúdo, formulário
└── Footer (fixo)   — botões de ação (via prop footer)
```

`min-h-[70vh] max-h-[92vh]` — o body cresce com `flex-1 overflow-y-auto`.

---

## Componentes de Base

### `ComboBox`

Dropdown com:
- Busca com debounce (300ms)
- Paginação infinita (`useInfiniteQuery`)
- Multi-select com chips
- **Portal** via `createPortal` — evita clipping por `overflow: auto` do modal pai
- `dropdownRef` excluído do handler de "fechar ao clicar fora" para seleção funcionar corretamente

Props principais:

| Prop | Tipo | Descrição |
|---|---|---|
| `fetchFn` | `(params) => Promise<{data, total}>` | Busca assíncrona paginada |
| `options` | `ComboBoxOption[]` | Lista estática (alternativa ao fetchFn) |
| `value` | `string \| string[]` | Valor selecionado |
| `onChange` | function | Callback de seleção |
| `multiple` | boolean | Multi-select |
| `clearable` | boolean | Exibe botão de limpar |
| `searchable` | boolean | Habilita campo de busca (auto se fetchFn) |
| `queryKey` | string | Chave única para cache do TanStack Query |
| `initialOptions` | `ComboBoxOption[]` | Opções pré-carregadas para exibição antes da busca |

### `FilterBar`

Barra colapsável de filtros. Genérica via `T extends object` — funciona com qualquer interface de filtros sem index signature.

- Tags ativas exibidas inline com botão de remoção individual
- Labels acima de cada campo no painel expandido
- Campos: `text`, `date`, `number`, `select` (usa `ComboBox` internamente)

### `Modal`

Props:

| Prop | Tipo | Descrição |
|---|---|---|
| `open` | boolean | Controla visibilidade |
| `onClose` | function | Fecha ao clicar no overlay ou no X |
| `title` | string | Título no header |
| `subtitle` | string | Subtítulo no header |
| `icon` | ReactNode | Ícone no header |
| `footer` | ReactNode | Conteúdo fixo no rodapé |
| `maxWidth` | `'sm'\|'md'\|'lg'\|'xl'\|'2xl'\|'3xl'\|'4xl'` | Largura máxima |

---

## Fluxos por Tela

### Pedidos

**Aluno:**
1. Abre "Novo Pedido" → seleciona itens, variações, tamanhos, quantidades
2. Acompanha status na tabela (filtros por data)

**Admin — Criar pedido em nome de aluno:**
1. Abre "Novo Pedido"
2. Aparece campo azul "Aluno recebedor" com ComboBox de busca de estudantes
3. Seleciona o aluno → preenche itens → envia
4. O pedido é criado com `userId` do aluno selecionado (via campo `userId` no DTO)

**Admin — Revisar pedido:**
1. Abre pedido pendente → tabela editável com toggle e input de quantidade por item
2. Pode adicionar novos itens (ComboBox + variação + tamanho + quantidade)
3. Escreve observações opcionais
4. "Aprovar" → itens com toggle OFF têm `approvedQuantity=0` (não debitam estoque)
5. "Recusar" → rejeita o pedido

**Admin — Entregar:**
1. Abre pedido aprovado → botão "Marcar como Entregue"
2. Confirm modal → chama `PATCH /orders/:id/deliver`
3. Estoque debitado apenas para itens com `approvedQuantity > 0`
4. E-mail de confirmação enviado ao aluno

### Itens

O **ItemModal** (compartilhado) trata criação e edição e reflete no front as regras de modelagem validadas no backend — a chave de estoque `(item, variação, tamanho)` é fixada na criação:

- **Criação:** todos os campos livres. Um aviso informa que `Tipo de Tamanho` e `Possui Variações?` **não poderão ser alterados depois**.
- **Edição:** `Tipo de Tamanho` e `Possui Variações?` ficam **desabilitados** (ícone de cadeado + motivo: alterá-los invalidaria o estoque existente).
- **Item com variações** (`hasVariations = true`): permite ativar/desativar e **adicionar** variações na edição.
- **Item sem variações** (`hasVariations = false`): bloco informativo explica que não é possível adicioná-las e orienta a criar um novo item como "de variação".
- Erros vindos do backend são exibidos com a mensagem real (helper `backendMsg` na `ItemsPage`).

### Remessas

- **ShipmentFormModal** unifica criação e edição. Recebe `shipment?: Shipment | null`:
  - `null` → modo criação (título "Nova Remessa", botão "Criar Remessa")
  - `Shipment` → modo edição (título "Editar Remessa #N", botão "Salvar Alterações")
- `useEffect` reseta o form quando `shipment` muda
- **ShipmentViewModal** exibe os itens e ações (Editar / Excluir / Cancelar / Finalizar) no footer

### Usuários

- **UserFormModal** com prop `mode: 'create' | 'edit'`:
  - `create` → form completo (nome, e-mail, tipo, campos acadêmicos ou cargo)
  - `edit` → form simplificado (nome, e-mail, status, matrícula/curso ou cargo)
- **UserImportModal** gerencia todo o estado do fluxo de importação internamente (file, step, validationResult, importResult). Só precisa de `open` e `onClose`.

### Perfil

- Visualização de dados pessoais (somente leitura)
- Troca de senha com validação Zod (mínimo 8 chars, maiúsculas, minúsculas, especial)
- **Exportar meus dados** → download JSON via `GET /auth/me/export` com Axios blob
- **Toggle de e-mails** → `PATCH /auth/preferences`

### Importação em Massa

Fluxo em 3 etapas dentro do `UserImportModal`:

| Etapa | Ação | Estado |
|---|---|---|
| 1 — Arquivo | Seleciona `.xlsx` ou `.xls` | `idle` → `validating` → `validated` |
| 2 — Validação | Exibe erros por linha/campo; pode trocar arquivo | `validated` |
| 3 — Importação | Processa; exibe criados/ignorados/falhas | `importing` → `done` |

Botões do footer mudam por etapa via prop `footer` do Modal.

---

## Serviços (`services/`)

### Convenções

- Todos re-exportados do barrel `services/index.ts`
- Downloads autenticados usam `api.get(..., { responseType: 'blob' })` + URL temporária (nunca `<a href>` direto para endpoints protegidos)
- IDs vindos do backend MySQL são strings (BIGINT) — usar `Number(id)` antes de enviar em DTOs

### `authService`

| Método | Endpoint | Descrição |
|---|---|---|
| `login(credentials)` | `POST /auth/login` | Retorna token + flags |
| `forgotPassword(email)` | `POST /auth/forgot-password` | Envia código |
| `resetPassword(email, code, newPassword)` | `POST /auth/reset-password` | Redefine senha |
| `changePassword(current, new)` | `PATCH /auth/change-password` | Troca senha autenticado |
| `me()` | `GET /auth/me` | Perfil completo |
| `updatePreferences(receiveEmails)` | `PATCH /auth/preferences` | Toggle e-mails |
| `acceptTerms()` | `PATCH /auth/accept-terms` | Registra aceite |
| `exportMyData()` | `GET /auth/me/export` | Download blob JSON |

### `usersService`

| Método | Endpoint | Descrição |
|---|---|---|
| `list(params)` | `GET /users` | Listagem com filtros |
| `get(id)` | `GET /users/:id` | Busca por ID |
| `create(dto)` | `POST /users` | Cria usuário |
| `update(id, dto)` | `PATCH /users/:id` | Atualiza |
| `remove(id)` | `DELETE /users/:id` | Remove permanentemente |
| `resetPassword(id)` | `POST /users/:id/reset-password` | Reseta senha |
| `downloadTemplate()` | `GET /users/import/template` | Download xlsx (blob) |
| `validateImport(file)` | `POST /users/import/validate` | Valida planilha |
| `bulkImport(file)` | `POST /users/import` | Importa planilha |

### `ordersService`

| Método | Endpoint | Descrição |
|---|---|---|
| `list(params)` | `GET /orders` | Listagem (admin: todos; aluno: próprios) |
| `get(id)` | `GET /orders/:id` | Busca por ID |
| `create(dto)` | `POST /orders` | Cria pedido (admin pode passar `userId`) |
| `review(id, dto)` | `PATCH /orders/:id/review` | Aprova/rejeita com edição por item |
| `deliver(id)` | `PATCH /orders/:id/deliver` | Entrega + debita estoque |

---

## Estado Global (`authStore`)

```typescript
interface AuthState {
  token:               string | null;
  user:                AuthUser | null;
  mustChangePassword:  boolean;
  mustAcceptTerms:     boolean;

  setAuth(token, user, mustChangePassword, mustAcceptTerms): void;
  setMustChangePassword(value): void;
  setMustAcceptTerms(value): void;
  logout(): void;
}
```

Persistência em `localStorage`:

| Chave | Conteúdo |
|---|---|
| `almoxpert_token` | JWT |
| `almoxpert_user` | dados básicos do usuário |
| `almoxpert_mcp` | flag mustChangePassword |
| `almoxpert_mat` | flag mustAcceptTerms |

---

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | URL base do backend |

---

## Convenções de Código

| Regra | Detalhe |
|---|---|
| Barrel de serviços | Importar de `services/index.ts`, não dos arquivos individuais (exceto `itemsService`) |
| Chaves de query | Nomeadas pela entidade: `['orders']`, `['users']`, `['me']` |
| Invalidação | `queryClient.invalidateQueries` após mutation de sucesso |
| Validação | Zod no cliente + erros inline nos campos; validação real no backend |
| Downloads protegidos | Axios blob + `URL.createObjectURL` + `a.click()` + revoke |
| BIGINT → number | Sempre `Number(id)` antes de enviar IDs em DTOs |
| Portal no ComboBox | `createPortal` evita clipping; `dropdownRef` exclui portal do handler de blur |
| Formulários em modais | `form="id"` no botão de submit + `id="..."` no `<form>` quando estão em elementos diferentes |
