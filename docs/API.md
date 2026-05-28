# AlmoXpert — API Reference

Backend: `apps/api` — NestJS REST API.

## Base URL

```
http://localhost:3000
```

Interactive docs (Swagger): `http://localhost:3000/api/docs`

## Authentication

All routes except public auth endpoints require a **Bearer token**.

```
Authorization: Bearer <accessToken>
```

---

## Auth

### POST `/auth/login`

Public. Returns a JWT token.

**Body**
```json
{
  "email": "admin@ifba.edu.br",
  "password": "suaSenha"
}
```

**Response**
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

- `mustChangePassword: true` — user must change password before using the system.
- `mustAcceptTerms: true` — user has not yet accepted the Terms of Use.

---

### POST `/auth/forgot-password`

Public. Sends a 6-digit reset code to the user's e-mail.

**Body**
```json
{ "email": "user@ifba.edu.br" }
```

Always returns 200 regardless of whether the e-mail exists (prevents user enumeration).

---

### POST `/auth/reset-password`

Public. Resets password using the code received by e-mail.

**Body**
```json
{
  "email": "user@ifba.edu.br",
  "code": "123456",
  "newPassword": "NovaSenha@123"
}
```

Password rules: min 8 chars, uppercase, lowercase, special character.

---

### PATCH `/auth/change-password`

Authenticated. Changes the current user's password.

**Body**
```json
{ "currentPassword": "senhaAtual", "newPassword": "NovaSenha@123" }
```

---

### PATCH `/auth/preferences`

Authenticated. Updates e-mail notification preference.

**Body**
```json
{ "receiveEmails": false }
```

---

### PATCH `/auth/accept-terms`

Authenticated. Records acceptance of the Terms of Use (`terms_accepted_at` timestamp).

---

### GET `/auth/me`

Authenticated. Returns the full profile including student or admin sub-profile.

---

### GET `/auth/me/export`

Authenticated. Downloads a JSON file with profile + order history (LGPD art. 18).

**Response:** `Content-Disposition: attachment; filename="meus-dados-almoxpert-YYYY-MM-DD.json"`

---

## Users

All users endpoints require `admin` role.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users (paginated + filters) |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create user (sends welcome e-mail) |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Permanently delete user |
| PATCH | `/users/:id/deactivate` | Deactivate account (soft disable) |
| POST | `/users/:id/reset-password` | Reset password to default |
| POST | `/users/import` | Bulk import students from Excel |
| GET | `/users/import/template` | Download Excel template |

### Filters — GET `/users`

```
?userType=student
?name=maria
?isActive=true
?registrationNumber=2023
?course=engenharia
?position=coordenador
?createdFrom=2026-01-01
?createdTo=2026-12-31
```

### POST `/users` — Create user

Sends a **welcome e-mail** with credentials (fire-and-forget, respects `receiveEmails`).

**Body (student)**
```json
{
  "name": "Maria da Silva",
  "email": "maria@aluno.ifba.edu.br",
  "password": "ifba.20231001",
  "userType": "student",
  "registrationNumber": "20231001",
  "course": "Engenharia de Software",
  "campus": "Vitória da Conquista",
  "educationLevel": "Graduação",
  "modality": "Bacharelado",
  "socialPrograms": "PNAES",
  "aids": ["Auxílio Alimentação (VC)"],
  "mealTypes": "Almoço"
}
```

**Body (admin)**
```json
{
  "name": "João Santos",
  "email": "joao@ifba.edu.br",
  "password": "Senha@123",
  "userType": "admin",
  "position": "Almoxarife"
}
```

### DELETE `/users/:id`

Permanently removes the user and all related records (CASCADE). Returns `204 No Content`.

> If the user is responsible for shipments (`ON DELETE RESTRICT`), the request will fail — resolve shipments first.

### POST `/users/:id/reset-password`

Resets the user's password to the system default (`ifba.{registrationNumber}` for students, `admin.{email}` for admins) and sets `mustChangePassword = true`. Sends a notification e-mail.

### POST `/users/import`

Multipart `file` field with `.xlsx`. Template from `GET /users/import/template`.

**Template columns:** Nome, E-mail, Matrícula, Campus, Curso, Nível de Ensino, Modalidade, Programas Sociais, Bolsas/Auxílios, Tipo de Refeição

---

## Items

Reading is allowed for any authenticated user. Writing requires `admin`.

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/items` | Any | List active items with variations |
| GET | `/items/:id` | Any | Get single item |
| POST | `/items` | Admin | Create item |
| PATCH | `/items/:id` | Admin | Update item |
| PATCH | `/items/:id/toggle` | Admin | Toggle active/inactive |
| POST | `/items/:id/variations` | Admin | Add variation |
| PATCH | `/items/:id/variations/:varId/toggle` | Admin | Toggle variation |

### POST `/items`

```json
{
  "name": "Camiseta",
  "type": "Uniforme",
  "unitOfMeasure": "unit",
  "hasVariations": false,
  "sizeType": "clothing"
}
```

`sizeType`: `"none"` | `"clothing"` | `"shoes"`

> Items with `hasVariations: false` should **not** have variation entries. Variation is only for items where the user must choose (color, type, etc.). Size is handled separately via `sizeType`.

---

## Stock

All stock endpoints require `admin`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stock` | Full stock list |
| GET | `/stock/low` | Items at or below minimum |
| GET | `/stock/:itemId/:variationId/:size` | Single entry |
| PATCH | `/stock/:itemId/:variationId/:size/minimum` | Update minimum |

> For items without variations, use `variationId = null` in the URL path — e.g., `/stock/6/null/M/minimum`.

---

## Shipments

All shipments endpoints require `admin`. Stock is updated **only when** a shipment is **completed**.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/shipments` | List (paginated + filters) |
| GET | `/shipments/:id` | Get shipment |
| POST | `/shipments` | Create |
| PATCH | `/shipments/:id` | Edit open shipment |
| DELETE | `/shipments/:id` | Delete open shipment |
| PATCH | `/shipments/:id/complete` | Complete → adds to stock |
| PATCH | `/shipments/:id/cancel` | Cancel |

### Filters

```
?status=open               # open | completed | cancelled
?responsibleId=1
?dateFrom=2026-01-01
?dateTo=2026-12-31
```

---

## Orders

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/orders` | Admin (all) / Student (own) | List orders |
| GET | `/orders/:id` | Admin / Student (own) | Get order |
| POST | `/orders` | Student / Admin | Place request (admin can specify `userId`) |
| PATCH | `/orders/:id/review` | Admin | Approve or reject |
| PATCH | `/orders/:id/deliver` | Admin | Mark as delivered + deduct stock + send e-mail |

### POST `/orders`

**Student body**
```json
{
  "items": [
    { "itemId": 2, "variationId": 3, "size": "none", "requestedQuantity": 2 }
  ]
}
```

**Admin body (on behalf of a student)**
```json
{
  "userId": 42,
  "items": [
    { "itemId": 6, "size": "M", "requestedQuantity": 1 }
  ]
}
```

- `userId` is optional and only respected when the requester is `admin`. If omitted, the order is registered to the authenticated user.
- The order is always created with `status: pending`.

### PATCH `/orders/:id/review`

Admin can adjust per-item quantities, toggle items off (approvedQuantity=0), and add new items to the order.

```json
{
  "status": "approved",
  "adminNotes": "Notebook não disponível.",
  "items": [
    { "orderItemId": 3, "approvedQuantity": 0 },
    { "orderItemId": 2, "approvedQuantity": 1 }
  ],
  "newItems": [
    { "itemId": 6, "size": "M", "approvedQuantity": 1 }
  ]
}
```

- Items with `approvedQuantity: 0` are marked as not approved and **excluded from stock deduction** on delivery.
- `newItems` are items added by the admin (not originally in the student's request). They appear in the delivery e-mail marked as "(adicionado)".

### PATCH `/orders/:id/deliver`

Deducts stock only for items where `approvedQuantity > 0`. Sends a delivery confirmation e-mail to the user (if `receiveEmails: true`).

### E-mails on review

| Condition | E-mail status |
|---|---|
| All items at requested quantity | `approved` |
| Any item quantity changed, or new items added | `approved_with_changes` |
| Status = rejected | `rejected` |

### Filters

```
?status=pending            # pending | approved | rejected | delivered
?userId=42
?userName=maria
?dateFrom=2026-01-01
?dateTo=2026-12-31
```

---

## Movements

All movements endpoints require `admin`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/movements` | Full audit log (paginated + filters) |
| GET | `/movements/item/:itemId` | Movements for a specific item |

### Filters

```
?itemId=1
?variationId=3
?movementType=out          # in | out
?originType=order          # shipment | order
?originId=7
?itemName=caneta
?dateFrom=2026-01-01
?dateTo=2026-12-31
```

---

## Pagination

All listing endpoints support:

```
?pageIndex=0        # Zero-based page (default: 0)
?pageSize=25        # Items per page (default: 25)
?sortBy=createdAt   # Sort field
?sortOrder=DESC     # ASC | DESC
```

**Response shape:**
```json
{
  "data": [...],
  "total": 120,
  "pageIndex": 0,
  "pageSize": 25
}
```

---

## RBAC

Authorization from `userType` in the JWT payload — no separate roles table.

| Role | Access |
|---|---|
| `admin` | All endpoints |
| `student` | `GET /items`, `POST /orders`, `GET /orders` (own), `GET /orders/:id` (own), all `GET/PATCH /auth/*` routes |

---

## E-mail Notifications

| Trigger | Recipient | Template |
|---|---|---|
| `POST /users` | New user | Welcome + credentials |
| `POST /auth/forgot-password` | User | 6-digit reset code |
| `POST /users/:id/reset-password` | User | New temporary password |
| `PATCH /orders/:id/review` | Student | Order status + item details |
| `PATCH /orders/:id/deliver` | Student | Delivery confirmation |

All e-mails are fire-and-forget and respect `users.receive_emails`. Without SMTP configured, they are logged to console (dev mode).

---

## Error Responses

```json
{ "statusCode": 400, "message": ["field is required"], "error": "Bad Request" }
{ "statusCode": 401, "message": "Unauthorized" }
{ "statusCode": 403, "message": "Forbidden resource" }
{ "statusCode": 404, "message": "Not Found" }
{ "statusCode": 409, "message": "E-mail já cadastrado" }
```

---

## Running Locally

```bash
yarn install
docker-compose -f docker-compose.dev.yml up -d db
cp apps/api/.env.example apps/api/.env
# Edit .env
yarn dev
# Swagger: http://localhost:3000/api/docs
```
