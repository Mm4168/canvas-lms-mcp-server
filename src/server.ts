import express from 'express';
import config from './index';
import logger from './utils/logger';
import MCPHandler from './mcpHandler';

const app = express();
const port = process.env.PORT || '8080';

/* ----------  basic middleware  ---------- */
app.use(express.json());

/* ----------  health endpoint ------------- */
app.get('/health', (_, res) => res.status(200).send('OK'));

/* ----------  MCP SSE endpoint ------------ */
const mcpHandler = new MCPHandler();

/*  establish a Server-Sent Events stream  */
app.get('/mcp', (req, res) => {
  const connectionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  mcpHandler.addConnection(connectionId, res);
});

/*  receive messages  */
app.post('/mcp', express.text({ type: '*/*' }), (req, res) => {
  const connectionId = req.query.id as string;
  if (!connectionId) return res.status(400).send('Missing id');
  mcpHandler.handleMessage(connectionId, req.body as string)
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(500));
});

/* ----------  start server  --------------- */
app.listen(Number(port), () => {
  logger.info(`Canvas-MCP server listening on ${port}`);
});
