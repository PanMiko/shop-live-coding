export const PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT = 'name_asc';

const compareNames = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

const SORTS = {
  name_asc: (a, b) => compareNames(a, b) || a.id - b.id,
  name_desc: (a, b) => compareNames(b, a) || a.id - b.id,
  price_asc: (a, b) => a.price - b.price || a.id - b.id,
  price_desc: (a, b) => b.price - a.price || a.id - b.id,
};

export const SORT_OPTIONS = Object.keys(SORTS);

export class ApiError extends Error {
  constructor(status, error, message, extra = {}) {
    super(message);
    this.status = status;
    this.body = { error, ...(message && { message }), ...extra };
  }
}

const invalidParams = (message) => new ApiError(400, 'INVALID_PARAMS', message);
const invalidOrder = (message) => new ApiError(400, 'INVALID_ORDER', message);

const readParam = (params, name) => {
  const value = params.get(name);
  return value === null || value.trim() === '' ? null : value.trim();
};

const parsePage = (value) => {
  if (value === null) return 1;
  if (!/^[1-9]\d*$/.test(value)) throw invalidParams('page must be a positive integer');
  return Number(value);
};

const parsePageSize = (value) => {
  if (value === null) return DEFAULT_PAGE_SIZE;
  const size = Number(value);
  if (!PAGE_SIZES.includes(size) || !/^\d+$/.test(value)) {
    throw invalidParams(`pageSize must be one of ${PAGE_SIZES.join(', ')}`);
  }
  return size;
};

export const createCatalog = ({ products, categories }) => {
  const stock = structuredClone(products);
  const byId = new Map(stock.map((product) => [product.id, product]));
  const categoryIds = new Set(categories.map((category) => category.id));
  let nextOrderNumber = 1001;

  const listCategories = () => categories;

  const listProducts = (params) => {
    const search = (readParam(params, 'search') ?? '').toLowerCase();
    const category = readParam(params, 'category');
    const sort = readParam(params, 'sort') ?? DEFAULT_SORT;
    const page = parsePage(readParam(params, 'page'));
    const pageSize = parsePageSize(readParam(params, 'pageSize'));

    if (category !== null && !categoryIds.has(category)) {
      throw invalidParams(`category must be one of ${[...categoryIds].join(', ')}`);
    }
    if (!SORTS[sort]) throw invalidParams(`sort must be one of ${SORT_OPTIONS.join(', ')}`);

    const matching = stock
      .filter((product) => category === null || product.categoryId === category)
      .filter((product) => product.name.toLowerCase().includes(search))
      .sort(SORTS[sort]);

    const start = (page - 1) * pageSize;
    return { items: matching.slice(start, start + pageSize), total: matching.length, page, pageSize };
  };

  const getProduct = (rawId) => {
    const product = /^\d+$/.test(rawId) ? byId.get(Number(rawId)) : undefined;
    if (!product) throw new ApiError(404, 'NOT_FOUND', `Product ${rawId} does not exist`);
    return product;
  };

  const parseOrder = (body) => {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw invalidOrder('Body must be an object: { "items": [{ "productId": number, "quantity": number }] }');
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw invalidOrder('items must be a non-empty array');
    }

    const quantities = new Map();
    for (const item of body.items) {
      const { productId, quantity } = item ?? {};
      if (!Number.isInteger(productId)) throw invalidOrder('productId must be an integer');
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw invalidOrder('quantity must be an integer greater than 0');
      }
      if (!byId.has(productId)) throw invalidOrder(`Product ${productId} does not exist`);
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
    return quantities;
  };

  const placeOrder = (body) => {
    const quantities = parseOrder(body);

    const shortages = [...quantities]
      .filter(([productId, quantity]) => quantity > byId.get(productId).stock)
      .map(([productId]) => ({ productId, available: byId.get(productId).stock }));

    if (shortages.length > 0) {
      throw new ApiError(409, 'OUT_OF_STOCK', 'Some products are not available in the requested quantity', {
        items: shortages,
      });
    }

    for (const [productId, quantity] of quantities) byId.get(productId).stock -= quantity;
    return { orderId: `ORD-${nextOrderNumber++}` };
  };

  return { listCategories, listProducts, getProduct, placeOrder };
};
