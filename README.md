# Shop — live-coding task

## Requirements

API reference (data model, endpoints, errors): [backend/README.md](backend/README.md)

### Product list

- Display the list of products from the API (`GET /api/products`)
- Search / filtering — `search` (text input, matches the product `name`) + `category` (select, options from `GET /api/categories`)
- Sorting — `sort`: `name_asc` / `name_desc` / `price_asc` / `price_desc`
- Pagination — `page` (1, 2, …)
- Persist the filters, sorting and pagination
- Add a product to the cart

### Cart

- Show the added products
- Show the cart total
- Persist the cart
- (*nice to have*) Remove a product from the cart

## Setup

This repository contains everything you need for the task:

| Folder | What it is |
|--------|------------|
| `backend/` | A ready-to-use mock shop API. You only call it — no need to read or change its code. |
| `react-app/` | A freshly generated React + TypeScript project (Vite). |
| `angular-app/` | A freshly generated Angular project (Angular CLI). |

Pick **one** of the frontend projects and build the task in it. You are free to
install any libraries you like (UI kit, data grid, state management, etc.).

### Prerequisites

- Node.js **22.22+** or **24.15+** (check with `node -v`)
- npm (comes with Node.js)

### 1. Start the backend

```bash
cd backend
npm start
```

The API runs at <http://localhost:3001>. It has no dependencies, so there is no
`npm install` step. Leave it running in its own terminal.

The full API reference (endpoints, parameters, errors) is in
[`backend/README.md`](backend/README.md). CORS is open, so the frontend can call
`http://localhost:3001/api/...` directly.

### 2. Start a frontend

React:

```bash
cd react-app
npm install
npm run dev
```

The app runs at <http://localhost:5173>.

Angular:

```bash
cd angular-app
npm install
npm start
```

The app runs at <http://localhost:4200>.
