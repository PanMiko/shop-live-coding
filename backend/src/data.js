import { readFileSync } from 'node:fs';

const readJson = (fileName) => JSON.parse(readFileSync(new URL(`../data/${fileName}`, import.meta.url), 'utf8'));

export const loadData = () => ({
  products: readJson('products.json'),
  categories: readJson('categories.json'),
});
