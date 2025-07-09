import express from 'express';
import config from './index';
import logger from './utils/logger';
import MCPHandler from './mcpHandler';

const app = express();
const port = process.env.PORT || '8080';

// Basic middleware
app.use(express.json());

// Health endpoint
app.get('/health', (_, res) => {
  res.status(200).send('OK');
});

// MCP SSE endpoint
const mcpHandler = new MCPHandler();

// Establish a Server-Sent Events stream
app.get('/mcp', (req, res) => {
  const connectionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  mcpHandler.addConnection(connectionId, res);
});

// Receive messages
app.post('/mcp', express.text({ type: '*/*' }), async (req, res) => {
  const connectionId = req.query.id as string;
  if (!connectionId) {
    res.status(400).send('Missing id');
    return;
  }
  
  try {
    await mcpHandler.handleMessage(connectionId, req.body as string);
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error handling MCP message:', error);
    res.sendStatus(500);
  }
});

// Start server
app.listen(Number(port), () => {
  logger.info(`Canvas-MCP server listening on ${port}`);
});
