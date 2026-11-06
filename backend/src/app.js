import { ApiError, createCatalog } from './catalog.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const sendJson = (res, status, body) => {
  res.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
};

const notFound = () => new ApiError(404, 'NOT_FOUND', 'Route does not exist');
const methodNotAllowed = (method) => new ApiError(405, 'METHOD_NOT_ALLOWED', `${method} is not supported here`);

const createRoutes = (catalog) => [
  { pattern: /^\/api\/categories$/, GET: () => [200, catalog.listCategories()] },
  { pattern: /^\/api\/products$/, GET: ({ url }) => [200, catalog.listProducts(url.searchParams)] },
  { pattern: /^\/api\/products\/([^/]+)$/, GET: ({ match }) => [200, catalog.getProduct(match[1])] },
  { pattern: /^\/api\/orders$/, POST: async ({ req }) => [201, catalog.placeOrder(await readJsonBody(req))] },
];

export const createApp = ({ products, categories, log = () => {} }) => {
  const routes = createRoutes(createCatalog({ products, categories }));

  const handle = async (req, res, url) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    const route = routes.find(({ pattern }) => pattern.test(path));
    if (!route) throw notFound();

    const handler = route[req.method];
    if (!handler) throw methodNotAllowed(req.method);

    if (url.searchParams.get('fail') === '1') {
      throw new ApiError(500, 'INTERNAL_ERROR', 'Forced server error (?fail=1)');
    }

    const [status, body] = await handler({ req, url, match: path.match(route.pattern) });
    sendJson(res, status, body);
  };

  return async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.on('finish', () => log(`${req.method} ${url.pathname}${url.search} -> ${res.statusCode}`));
    try {
      await handle(req, res, url);
    } catch (error) {
      if (error instanceof ApiError) {
        sendJson(res, error.status, error.body);
      } else {
        console.error(error);
        sendJson(res, 500, { error: 'INTERNAL_ERROR', message: 'Unexpected server error' });
      }
    }
  };
};
