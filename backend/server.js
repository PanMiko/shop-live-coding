import { createServer } from 'node:http';
import { createApp } from './src/app.js';
import { loadData } from './src/data.js';

const port = Number(process.env.PORT) || 3001;
const { products, categories } = loadData();

const server = createServer(createApp({ products, categories, log: (line) => console.log(line) }));

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other process or run with another port, e.g. PORT=3002 npm start`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, () => {
  console.log(`Shop API is running at http://localhost:${port}`);
  console.log(`Try: http://localhost:${port}/api/products`);
  console.log('Stock changes are kept in memory only - restart the server to reset them. Press Ctrl+C to stop.');
});
