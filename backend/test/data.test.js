import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../src/data.js';

const { products, categories } = loadData();

describe('data files', () => {
  test('contain 5 categories with unique ids and names', () => {
    assert.equal(categories.length, 5);
    assert.equal(new Set(categories.map((c) => c.id)).size, 5);
    for (const category of categories) {
      assert.match(category.id, /^[a-z-]+$/);
      assert.equal(typeof category.name, 'string');
    }
  });

  test('contain 100 products with ids 1..100', () => {
    assert.equal(products.length, 100);
    assert.deepEqual(
      products.map((p) => p.id).sort((a, b) => a - b),
      Array.from({ length: 100 }, (_, i) => i + 1),
    );
  });

  test('every product has a valid shape', () => {
    const categoryIds = new Set(categories.map((c) => c.id));
    for (const product of products) {
      assert.deepEqual(Object.keys(product).sort(), ['categoryId', 'description', 'id', 'name', 'price', 'stock']);
      assert.ok(product.name.trim().length > 0, `name of ${product.id}`);
      assert.ok(product.description.trim().length > 0, `description of ${product.id}`);
      assert.ok(categoryIds.has(product.categoryId), `category of ${product.id}`);
      assert.ok(product.price > 0 && /^\d+(\.\d{1,2})?$/.test(String(product.price)), `price of ${product.id}`);
      assert.ok(Number.isInteger(product.stock) && product.stock >= 0, `stock of ${product.id}`);
    }
  });

  test('product names are unique', () => {
    assert.equal(new Set(products.map((p) => p.name.toLowerCase())).size, products.length);
  });

  test('every category has 20 products', () => {
    for (const category of categories) {
      assert.equal(products.filter((p) => p.categoryId === category.id).length, 20, category.id);
    }
  });

  test('include sold-out and last-item products to exercise stock handling', () => {
    assert.ok(products.filter((p) => p.stock === 0).length >= 5);
    assert.ok(products.filter((p) => p.stock === 1).length >= 5);
  });

  test('include equal prices to exercise stable sorting', () => {
    const prices = products.map((p) => p.price);
    assert.ok(new Set(prices).size < prices.length);
  });
});
