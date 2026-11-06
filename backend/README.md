# Shop API

A small backend for the shop task. You do not need to read or change this code,
only call the API from your frontend.

## Running

Requirements: **Node.js 18 or newer**. There are no dependencies, so there is no
`npm install` step.

```bash
npm start
```

The API runs at **http://localhost:3001**. CORS is open, so you can call it
directly from any dev server (Vite, Angular CLI, etc.).

To use a different port: `PORT=3002 npm start` (PowerShell: `$env:PORT=3002; npm start`).

Stock changes made by orders are kept in memory. Restart the server to reset them.

## Data model

```ts
type Category = {
  id: string;          // e.g. "electronics"
  name: string;        // e.g. "Electronics"
};

type Product = {
  id: number;
  name: string;
  price: number;       // PLN, e.g. 79.99
  categoryId: string;  // Category.id
  stock: number;       // items available, 0 = sold out
  description: string;
};

type ProductPage = {
  items: Product[];    // products on the requested page
  total: number;       // number of ALL products matching the filters
  page: number;
  pageSize: number;
};

type ApiError = {
  error: string;       // machine-readable code, see below
  message?: string;    // human-readable description
};
```

## Endpoints

### `GET /api/categories`

Returns `Category[]`.

### `GET /api/products`

Returns a `ProductPage`. Filtering, sorting and pagination are done by the server.

| Query param | Values | Default |
|-------------|--------|---------|
| `search`    | text contained in the product name, case-insensitive | none |
| `category`  | a `Category.id` | all categories |
| `sort`      | `name_asc`, `name_desc`, `price_asc`, `price_desc` | `name_asc` |
| `page`      | positive integer, starts at `1` | `1` |
| `pageSize`  | `10`, `20` or `50` | `10` |

Empty parameters (e.g. `search=`) are treated as not provided.

Example:

```
GET /api/products?search=code&category=books&sort=price_asc&page=1&pageSize=10
```

```json
{
  "items": [
    { "id": 2, "name": "Clean Code", "price": 89.99, "categoryId": "books", "stock": 1, "description": "A handbook of agile software craftsmanship." },
    { "id": 37, "name": "Working Effectively with Legacy Code", "price": 129, "categoryId": "books", "stock": 0, "description": "Techniques for safely changing code without tests." },
    { "id": 67, "name": "Code Complete", "price": 149, "categoryId": "books", "stock": 20, "description": "A practical handbook of software construction." }
  ],
  "total": 3,
  "page": 1,
  "pageSize": 10
}
```

A page beyond the last one is not an error: it returns `items: []` together with
the real `total`.

Errors:

- `400 INVALID_PARAMS`: unknown `category` or `sort`, `page` that is not a positive
  integer, or `pageSize` outside the allowed values.

### `GET /api/products/:id`

Returns a single `Product`.

Errors:

- `404 NOT_FOUND`: the product does not exist.

### `POST /api/orders`

Places an order and decreases stock.

Request body (`Content-Type: application/json`):

```json
{
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 7, "quantity": 1 }
  ]
}
```

Success: `201`

```json
{ "orderId": "ORD-1001" }
```

Errors:

- `409 OUT_OF_STOCK`: at least one product is not available in the requested
  quantity. Nothing is ordered. `items` lists every problematic product with the
  quantity that is still available:

  ```json
  {
    "error": "OUT_OF_STOCK",
    "message": "Some products are not available in the requested quantity",
    "items": [{ "productId": 7, "available": 0 }]
  }
  ```

- `400 INVALID_ORDER`: the body has the wrong shape, for example an empty `items`
  array, a quantity that is not a positive integer, or an unknown `productId`.
- `400 INVALID_JSON`: the body is not valid JSON.

## Simulating a server error

Add `fail=1` to any request to get `500 INTERNAL_ERROR`, e.g.
`GET /api/products?fail=1`. Nothing is changed on the server when this happens.
