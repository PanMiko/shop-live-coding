import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

const categories = [
  { id: 'books', name: 'Books' },
  { id: 'toys', name: 'Toys' },
];

const fixtureProducts = () => [
  { id: 1, name: 'Zebra Plush', price: 30, categoryId: 'toys', stock: 5, description: 'd1' },
  { id: 2, name: 'apple Book', price: 10, categoryId: 'books', stock: 0, description: 'd2' },
  { id: 3, name: 'Clean Code', price: 20, categoryId: 'books', stock: 1, description: 'd3' },
  { id: 4, name: 'Building Blocks', price: 20, categoryId: 'toys', stock: 3, description: 'd4' },
  { id: 5, name: 'Design Patterns', price: 50, categoryId: 'books', stock: 2, description: 'd5' },
];

let server;
let baseUrl;

const manyProducts = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Product ${String(index + 1).padStart(2, '0')}`,
    price: 10,
    categoryId: 'books',
    stock: 1,
    description: '',
  }));

const startServer = async (products = fixtureProducts()) => {
  server = createServer(createApp({ products, categories }));
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
};

const stopServer = () => new Promise((resolve) => server.close(resolve));

const get = (path) => fetch(baseUrl + path);
const postOrder = (body, path = '/api/orders') =>
  fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const ids = (page) => page.items.map((item) => item.id);

describe('pagination', () => {
  beforeEach(() => startServer(manyProducts(25)));
  afterEach(stopServer);

  test('returns the requested slice', async () => {
    const body = await (await get('/api/products?page=2&pageSize=10')).json();
    assert.equal(body.total, 25);
    assert.deepEqual(ids(body), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  test('returns a partial last page', async () => {
    const body = await (await get('/api/products?page=3&pageSize=10')).json();
    assert.deepEqual(ids(body), [21, 22, 23, 24, 25]);
  });

  test('applies the page size', async () => {
    const body = await (await get('/api/products?page=2&pageSize=20')).json();
    assert.deepEqual(ids(body), [21, 22, 23, 24, 25]);
  });
});

describe('shop api', () => {
  beforeEach(() => startServer());
  afterEach(stopServer);

  describe('GET /api/categories', () => {
    test('returns all categories', async () => {
      const res = await get('/api/categories');
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), categories);
    });
  });

  describe('GET /api/products', () => {
    test('defaults to page 1, page size 10, sorted by name ascending', async () => {
      const res = await get('/api/products');
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.page, 1);
      assert.equal(body.pageSize, 10);
      assert.equal(body.total, 5);
      assert.deepEqual(ids(body), [2, 4, 3, 5, 1]);
    });

    test('returns full product objects', async () => {
      const body = await (await get('/api/products?search=clean')).json();
      assert.deepEqual(body.items, [
        { id: 3, name: 'Clean Code', price: 20, categoryId: 'books', stock: 1, description: 'd3' },
      ]);
    });

    test('searches by name, case-insensitive, ignoring surrounding whitespace', async () => {
      const body = await (await get('/api/products?search=%20BOOK%20')).json();
      assert.equal(body.total, 1);
      assert.deepEqual(ids(body), [2]);
    });

    test('treats an empty search as no search', async () => {
      const body = await (await get('/api/products?search=')).json();
      assert.equal(body.total, 5);
    });

    test('filters by category', async () => {
      const body = await (await get('/api/products?category=toys')).json();
      assert.equal(body.total, 2);
      assert.deepEqual(ids(body), [4, 1]);
    });

    test('rejects an unknown category', async () => {
      const res = await get('/api/products?category=cars');
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error, 'INVALID_PARAMS');
    });

    test('sorts by name descending', async () => {
      const body = await (await get('/api/products?sort=name_desc')).json();
      assert.deepEqual(ids(body), [1, 5, 3, 4, 2]);
    });

    test('sorts by price ascending, ties broken by id', async () => {
      const body = await (await get('/api/products?sort=price_asc')).json();
      assert.deepEqual(ids(body), [2, 3, 4, 1, 5]);
    });

    test('sorts by price descending, ties broken by id', async () => {
      const body = await (await get('/api/products?sort=price_desc')).json();
      assert.deepEqual(ids(body), [5, 1, 3, 4, 2]);
    });

    test('rejects an unknown sort', async () => {
      const res = await get('/api/products?sort=rating');
      assert.equal(res.status, 400);
    });

    test('combines search, category and sort', async () => {
      const body = await (await get('/api/products?search=e&category=books&sort=price_desc')).json();
      assert.equal(body.total, 3);
      assert.deepEqual(ids(body), [5, 3, 2]);
    });

    test('returns an empty page with the real total when the page is out of range', async () => {
      const res = await get('/api/products?page=99');
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body, { items: [], total: 5, page: 99, pageSize: 10 });
    });

    test('rejects page sizes other than 10, 20 and 50', async () => {
      for (const size of ['7', '0', '100', 'abc']) {
        const res = await get(`/api/products?pageSize=${size}`);
        assert.equal(res.status, 400, `pageSize=${size}`);
      }
      for (const size of ['10', '20', '50']) {
        const res = await get(`/api/products?pageSize=${size}`);
        assert.equal(res.status, 200, `pageSize=${size}`);
        assert.equal((await res.json()).pageSize, Number(size));
      }
    });

    test('rejects a page that is not a positive integer', async () => {
      for (const page of ['0', '-1', '1.5', 'abc']) {
        const res = await get(`/api/products?page=${page}`);
        assert.equal(res.status, 400, `page=${page}`);
      }
    });
  });

  describe('GET /api/products/:id', () => {
    test('returns a single product', async () => {
      const res = await get('/api/products/5');
      assert.equal(res.status, 200);
      assert.equal((await res.json()).name, 'Design Patterns');
    });

    test('returns 404 for an unknown product', async () => {
      for (const id of ['999', 'abc']) {
        const res = await get(`/api/products/${id}`);
        assert.equal(res.status, 404, `id=${id}`);
        assert.equal((await res.json()).error, 'NOT_FOUND');
      }
    });
  });

  describe('POST /api/orders', () => {
    test('creates an order and decreases stock', async () => {
      const res = await postOrder({ items: [{ productId: 1, quantity: 2 }, { productId: 3, quantity: 1 }] });
      assert.equal(res.status, 201);
      const { orderId } = await res.json();
      assert.equal(typeof orderId, 'string');
      assert.ok(orderId.length > 0);

      assert.equal((await (await get('/api/products/1')).json()).stock, 3);
      assert.equal((await (await get('/api/products/3')).json()).stock, 0);
    });

    test('returns unique order ids', async () => {
      const first = await (await postOrder({ items: [{ productId: 1, quantity: 1 }] })).json();
      const second = await (await postOrder({ items: [{ productId: 1, quantity: 1 }] })).json();
      assert.notEqual(first.orderId, second.orderId);
    });

    test('returns 409 with available stock when any item is out of stock, and changes nothing', async () => {
      const res = await postOrder({
        items: [
          { productId: 1, quantity: 1 },
          { productId: 2, quantity: 1 },
          { productId: 3, quantity: 2 },
        ],
      });
      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.error, 'OUT_OF_STOCK');
      assert.deepEqual(body.items, [
        { productId: 2, available: 0 },
        { productId: 3, available: 1 },
      ]);
      assert.equal((await (await get('/api/products/1')).json()).stock, 5);
    });

    test('sums quantities of duplicated products before checking stock', async () => {
      const res = await postOrder({ items: [{ productId: 3, quantity: 1 }, { productId: 3, quantity: 1 }] });
      assert.equal(res.status, 409);
      assert.deepEqual((await res.json()).items, [{ productId: 3, available: 1 }]);
    });

    test('rejects invalid order bodies', async () => {
      const invalidBodies = [
        {},
        { items: [] },
        { items: 'x' },
        { items: [{ productId: 1 }] },
        { items: [{ productId: 1, quantity: 0 }] },
        { items: [{ productId: 1, quantity: 1.5 }] },
        { items: [{ productId: '1', quantity: 1 }] },
        { items: [{ productId: 999, quantity: 1 }] },
        [],
        null,
      ];
      for (const body of invalidBodies) {
        const res = await postOrder(body);
        assert.equal(res.status, 400, JSON.stringify(body));
        assert.equal((await res.json()).error, 'INVALID_ORDER');
      }
    });

    test('rejects malformed JSON', async () => {
      const res = await postOrder('{"items": [');
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error, 'INVALID_JSON');
    });
  });

  describe('forced errors', () => {
    test('?fail=1 returns 500 on every endpoint and has no side effects', async () => {
      for (const path of ['/api/categories?fail=1', '/api/products?fail=1', '/api/products/1?fail=1']) {
        const res = await get(path);
        assert.equal(res.status, 500, path);
        assert.equal((await res.json()).error, 'INTERNAL_ERROR');
      }
      const res = await postOrder({ items: [{ productId: 1, quantity: 1 }] }, '/api/orders?fail=1');
      assert.equal(res.status, 500);
      assert.equal((await (await get('/api/products/1')).json()).stock, 5);
    });
  });

  describe('http basics', () => {
    test('allows cross-origin requests from any dev server', async () => {
      const res = await get('/api/products');
      assert.equal(res.headers.get('access-control-allow-origin'), '*');
    });

    test('answers CORS preflight requests', async () => {
      const res = await fetch(baseUrl + '/api/orders', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      });
      assert.equal(res.status, 204);
      assert.match(res.headers.get('access-control-allow-methods'), /POST/);
      assert.match(res.headers.get('access-control-allow-headers'), /content-type/i);
    });

    test('returns 404 for unknown routes', async () => {
      const res = await get('/api/unknown');
      assert.equal(res.status, 404);
      assert.equal((await res.json()).error, 'NOT_FOUND');
    });

    test('returns 405 for unsupported methods on known routes', async () => {
      const res = await fetch(baseUrl + '/api/products', { method: 'DELETE' });
      assert.equal(res.status, 405);
    });
  });
});
