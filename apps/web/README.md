# AlmoXpert — Frontend

Interface web do sistema de gestão de almoxarifado do IFBA.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Estilos | Tailwind CSS v3 |
| Roteamento | React Router DOM v7 |
| Estado global | Zustand (persistência em localStorage) |
| Formulários | React Hook Form + Zod |
| Data fetching | TanStack Query v5 |
| HTTP | Axios |
| Ícones | Lucide React |
| Datas | date-fns + locale ptBR |

## Estrutura

```
src/
├── types/          # Tipos TypeScript (DTOs, interfaces, enums)
├── services/       # Camada de API (barrel em index.ts)
│   ├── api.ts               # Instância Axios + interceptor JWT
│   ├── authService.ts       # Login, senha, preferências, exportação LGPD
│   ├── itemsService.ts      # Itens e variações
│   ├── stockService.ts      # Estoque
│   ├── shipmentsService.ts  # Remessas
│   ├── ordersService.ts     # Pedidos
│   ├── movementsService.ts  # Movimentações
│   └── usersService.ts      # Usuários + importação
├── store/
│   └── authStore.ts         # Zustand: token, user, mustChangePassword, mustAcceptTerms
├── utils/          # cn(), formatDate(), getInitials(), aidColor(), statusLabels
├── hooks/          # Custom hooks
├── components/
│   ├── ui/         # Button, Input, Select, ComboBox, Table, Modal, Badge,
│   │               # Pagination, Toast, StatCard, FilterBar, Textarea
│   ├── layout/     # Sidebar, AppLayout (gerencia sidebar mobile)
│   └── modals/     # ItemModal (compartilhado)
└── pages/
    ├── auth/
    │   ├── LoginPage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   └── ResetPasswordPage.tsx
    ├── dashboard/
    ├── items/
    ├── stock/
    │   └── modals/
    │       └── StockMinModal.tsx       # Editar mínimo de estoque
    ├── shipments/
    │   └── modals/
    │       ├── ShipmentFormModal.tsx   # Criar + editar (unificado)
    │       └── ShipmentViewModal.tsx  # Visualizar + ações
    ├── orders/
    │   └── modals/
    │       ├── OrderViewModal.tsx      # Visualizar + revisão editável pelo admin
    │       └── OrderCreateModal.tsx   # Criar pedido
    ├── movements/
    ├── users/
    │   ├── UserFilters.tsx
    │   └── modals/
    │       ├── UserFormModal.tsx       # Criar + editar (unificado, mode prop)
    │       └── UserImportModal.tsx    # Importação em 3 etapas
    └── ProfilePage.tsx                # Perfil, troca de senha, exportação, notificações
```

## Instalação

```bash
# A partir da raiz do monorepo
yarn install
cp apps/web/.env.example apps/web/.env
yarn dev:web      # porta 5173
yarn build:web    # build de produção
```

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | URL base do backend |

## Fluxos Principais

### Autenticação

- Login via `POST /auth/login`; token armazenado no Zustand com persistência em `localStorage`
- Interceptor Axios injeta `Authorization: Bearer <token>` em todas as requisições
- Token expirado → logout automático + redirect para `/login`

### Primeiro Acesso

1. `mustChangePassword: true` → usuário redirecionado ao perfil, bloqueado até trocar a senha
2. `mustAcceptTerms: true` → `TermsModal` sobrepõe toda a interface; aceite chama `PATCH /auth/accept-terms`

### Recuperação de Senha

- `/forgot-password` → informa e-mail, recebe código de 6 dígitos
- `/reset-password` → informa e-mail + código + nova senha

### Perfil (`/profile`)

- Visualização de dados pessoais
- Troca de senha com validação Zod
- **Exportar meus dados** — JSON com perfil + histórico de pedidos (LGPD art. 18)
- **Toggle de e-mails** — atualiza `receive_emails` via `PATCH /auth/preferences`

### RBAC

| Seção | Admin | Aluno |
|---|---|---|
| Dashboard | Sim | Não |
| Itens | Sim (CRUD) | Não |
| Estoque | Sim | Não |
| Remessas | Sim | Não |
| Pedidos | Sim (todos) | Sim (os seus) |
| Movimentações | Sim | Não |
| Usuários | Sim | Não |
| Perfil | Sim | Sim |

### Pedidos — Fluxo Admin

1. Admin abre pedido pendente → vê tabela editável com toggle por item e input de quantidade
2. Pode adicionar novos itens ao pedido (ComboBox + variação + tamanho + quantidade)
3. Pode escrever observações para o aluno
4. Clica "Aprovar Pedido" → itens com toggle OFF têm `approvedQuantity=0` (não deduzem estoque)
5. Clica "Marcar como Entregue" → estoque deduzido apenas para itens com `approvedQuantity > 0`

### Pedidos — Fluxo Aluno

1. Seleciona itens, variações, tamanhos e quantidades
2. Acompanha status (pendente → aprovado → entregue / recusado)

### Importação em Massa

1. Baixa planilha modelo (botão autenticado via Axios blob)
2. Preenche dados (colunas: Nome, E-mail, Matrícula, Campus, Curso, Nível, Modalidade, Programas Sociais, Auxílios, Refeição)
3. Upload → **Etapa 1**: validação com lista de erros por linha
4. **Etapa 2**: importação, retorna criados/ignorados/falhas

### Modais

Cada tela tem seus modais em `pages/<tela>/modals/`. Padrão:
- Modal recebe dados (`user?`, `shipment?`, `order`) + callbacks (`onSave`, `onClose`, `onReview`)
- Estado de formulário (`useForm`, `useFieldArray`) encapsulado dentro do modal
- Botões de ação fixos no rodapé via prop `footer` do `Modal` base
- Submit de formulários dentro de modais usa `form="form-id"` para funcionar fora da tag `<form>`

## Componentes UI

| Componente | Descrição |
|---|---|
| `Button` | Variantes: `primary`, `secondary`, `danger`, `success`; prop `loading` |
| `Input` / `Textarea` | Com label e mensagem de erro integrada |
| `Select` | Select nativo estilizado |
| `ComboBox` | Dropdown com busca, paginação infinita, multi-select, portal (não cortado por overflow) |
| `Modal` | Base com `header` fixo, `body` com scroll, `footer` fixo via prop |
| `ConfirmModal` | Modal de confirmação com variantes de cor |
| `TermsModal` | Modal de Termos de Uso (LGPD), bloqueante, exige aceite com checkbox |
| `Table` | Tabela paginada com colunas renderizáveis |
| `Pagination` | Navegação de páginas |
| `Badge` | Tags coloridas com dot opcional |
| `FilterBar` | Barra de filtros colapsável com tags ativas e labels nos campos |
| `StatCard` | Card de métrica para dashboard |
| `Toast` | Fila de notificações (success/error/info) |

## Convenções

- **Serviços**: todos exportados do barrel `services/index.ts`
- **Queries**: nomeadas por chave `['items']`, `['orders']`, `['me']`
- **Mutações**: invalidam a query correspondente após sucesso (`queryClient.invalidateQueries`)
- **Validação**: Zod no cliente antes de submeter; erros inline nos campos
- **Downloads autenticados**: Axios com `responseType: 'blob'` + URL temporária (nunca `<a href>` direto)
- **ComboBox em modais**: usa `createPortal` para evitar clipping por `overflow: auto` do modal
- **BIGINT do MySQL**: IDs vindos do backend são strings — sempre usar `Number(id)` antes de enviar em DTOs
