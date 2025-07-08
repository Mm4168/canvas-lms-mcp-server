"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPHandler = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const index_1 = __importDefault(require("./config/index"));
const logger_1 = __importDefault(require("./utils/logger"));
const canvasTools_1 = require("./canvasTools");
const mcp_1 = require("./types/mcp");
const canvasClient_1 = require("./canvasClient");
class MCPHandler extends events_1.EventEmitter {
    constructor() {
        super();
        this.connections = new Map();
        this.heartbeatInterval = null;
        this.toolRegistry = new canvasTools_1.CanvasToolRegistry();
        this.startHeartbeat();
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.cleanupStaleConnections();
            this.sendHeartbeat();
        }, index_1.default.mcp.heartbeatInterval);
    }
    cleanupStaleConnections() {
        const now = new Date();
        const timeout = index_1.default.mcp.connectionTimeout;
        for (const [connectionId, connection] of this.connections) {
            const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
            if (timeSinceLastActivity > timeout) {
                logger_1.default.info(`Cleaning up stale connection: ${connectionId}`);
                this.removeConnection(connectionId);
            }
        }
    }
    sendHeartbeat() {
        const heartbeatMessage = {
            jsonrpc: '2.0',
            method: 'notifications/ping',
            params: {
                timestamp: new Date().toISOString(),
            },
        };
        for (const connection of this.connections.values()) {
            this.sendMessage(connection, heartbeatMessage);
        }
    }
    addConnection(connectionId, response) {
        if (this.connections.size >= index_1.default.mcp.maxConnections) {
            logger_1.default.warn(`Maximum connections reached (${index_1.default.mcp.maxConnections}), rejecting new connection`);
            response.status(503).json({ error: 'Maximum connections reached' });
            return;
        }
        const connection = {
            id: connectionId,
            response,
            authenticated: false,
            lastActivity: new Date(),
        };
        this.connections.set(connectionId, connection);
        logger_1.default.info(`New MCP connection established: ${connectionId}`);
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        });
        this.sendMessage(connection, {
            jsonrpc: '2.0',
            method: 'notifications/message',
            params: {
                level: 'info',
                message: 'Connected to Canvas LMS MCP Server',
            },
        });
        response.on('close', () => {
            this.removeConnection(connectionId);
        });
        response.on('error', (error) => {
            logger_1.default.error(`SSE connection error for ${connectionId}:`, error);
            this.removeConnection(connectionId);
        });
    }
    removeConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            try {
                connection.response.end();
            }
            catch (error) {
                logger_1.default.debug(`Error closing connection ${connectionId}:`, error);
            }
            this.connections.delete(connectionId);
            logger_1.default.info(`MCP connection closed: ${connectionId}`);
        }
    }
    sendMessage(connection, message) {
        try {
            const sseMessage = {
                id: (0, uuid_1.v4)(),
                data: JSON.stringify(message),
            };
            let sseData = `id: ${sseMessage.id}\n`;
            if (sseMessage.event) {
                sseData += `event: ${sseMessage.event}\n`;
            }
            sseData += `data: ${sseMessage.data}\n\n`;
            connection.response.write(sseData);
            connection.lastActivity = new Date();
        }
        catch (error) {
            logger_1.default.error(`Failed to send message to connection ${connection.id}:`, error);
            this.removeConnection(connection.id);
        }
    }
    sendResponse(connection, response) {
        this.sendMessage(connection, response);
    }
    sendError(connection, id, code, message, data) {
        const errorResponse = {
            jsonrpc: '2.0',
            id: id || 'unknown',
            error: {
                code,
                message,
                data,
            },
        };
        this.sendResponse(connection, errorResponse);
    }
    async handleMessage(connectionId, messageData) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            logger_1.default.warn(`Received message for unknown connection: ${connectionId}`);
            return;
        }
        connection.lastActivity = new Date();
        try {
            const message = JSON.parse(messageData);
            if (!this.isValidMCPMessage(message)) {
                this.sendError(connection, message?.id, mcp_1.MCPErrorCode.INVALID_REQUEST, 'Invalid MCP message format');
                return;
            }
            if (message.method) {
                await this.handleRequest(connection, message);
            }
            else if (message.result !== undefined || message.error !== undefined) {
                logger_1.default.debug(`Received response from client ${connectionId}:`, message);
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to parse message from ${connectionId}:`, error);
            this.sendError(connection, undefined, mcp_1.MCPErrorCode.PARSE_ERROR, 'Failed to parse JSON message');
        }
    }
    isValidMCPMessage(message) {
        return (message &&
            typeof message === 'object' &&
            message.jsonrpc === '2.0' &&
            (message.method || message.result !== undefined || message.error !== undefined));
    }
    async handleRequest(connection, request) {
        try {
            switch (request.method) {
                case mcp_1.MCPMethod.INITIALIZE:
                    await this.handleInitialize(connection, request);
                    break;
                case mcp_1.MCPMethod.INITIALIZED:
                    await this.handleInitialized(connection, request);
                    break;
                case mcp_1.MCPMethod.PING:
                    await this.handlePing(connection, request);
                    break;
                case mcp_1.MCPMethod.TOOLS_LIST:
                    await this.handleToolsList(connection, request);
                    break;
                case mcp_1.MCPMethod.TOOLS_CALL:
                    await this.handleToolsCall(connection, request);
                    break;
                case mcp_1.MCPMethod.RESOURCES_LIST:
                    await this.handleResourcesList(connection, request);
                    break;
                case mcp_1.MCPMethod.RESOURCES_READ:
                    await this.handleResourcesRead(connection, request);
                    break;
                case mcp_1.MCPMethod.PROMPTS_LIST:
                    await this.handlePromptsList(connection, request);
                    break;
                case mcp_1.MCPMethod.PROMPTS_GET:
                    await this.handlePromptsGet(connection, request);
                    break;
                default:
                    this.sendError(connection, request.id, mcp_1.MCPErrorCode.METHOD_NOT_FOUND, `Method not found: ${request.method}`);
            }
        }
        catch (error) {
            logger_1.default.error(`Error handling request ${request.method}:`, error);
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.INTERNAL_ERROR, 'Internal server error');
        }
    }
    async handleInitialize(connection, request) {
        const params = request.params;
        if (!params || !params.protocolVersion || !params.clientInfo) {
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.INVALID_PARAMS, 'Missing required initialization parameters');
            return;
        }
        connection.clientInfo = params.clientInfo;
        connection.capabilities = params.capabilities;
        const result = {
            protocolVersion: index_1.default.mcp.protocolVersion,
            capabilities: {
                tools: { listChanged: true },
                resources: { subscribe: false, listChanged: true },
                prompts: { listChanged: true },
                logging: {},
            },
            serverInfo: {
                name: index_1.default.mcp.serverName,
                version: index_1.default.mcp.serverVersion,
                protocolVersion: index_1.default.mcp.protocolVersion,
                capabilities: {
                    tools: { listChanged: true },
                    resources: { subscribe: false, listChanged: true },
                    prompts: { listChanged: true },
                    logging: {},
                },
            },
        };
        this.sendResponse(connection, {
            jsonrpc: '2.0',
            id: request.id,
            result,
        });
        logger_1.default.info(`Client initialized: ${params.clientInfo.name} v${params.clientInfo.version}`);
    }
    async handleInitialized(connection, request) {
        connection.authenticated = true;
        logger_1.default.info(`Connection ${connection.id} is now initialized and ready`);
    }
    async handlePing(connection, request) {
        this.sendResponse(connection, {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                timestamp: new Date().toISOString(),
            },
        });
    }
    async handleToolsList(connection, request) {
        if (!connection.authenticated) {
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
            return;
        }
        const tools = await this.toolRegistry.getAvailableTools();
        this.sendResponse(connection, {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                tools,
            },
        });
    }
    async handleToolsCall(connection, request) {
        if (!connection.authenticated) {
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
            return;
        }
        const params = request.params;
        if (!params || !params.name) {
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.INVALID_PARAMS, 'Missing tool name');
            return;
        }
        try {
            const accessToken = params.arguments?.access_token;
            if (!accessToken) {
                this.sendError(connection, request.id, mcp_1.MCPErrorCode.AUTHENTICATION_ERROR, 'Canvas access token required');
                return;
            }
            const canvasClient = new canvasClient_1.CanvasAPIClient(accessToken);
            const isValidToken = await canvasClient.validateToken();
            if (!isValidToken) {
                this.sendError(connection, request.id, mcp_1.MCPErrorCode.AUTHENTICATION_ERROR, 'Invalid Canvas access token');
                return;
            }
            const result = await this.toolRegistry.executeTool(params.name, params.arguments, canvasClient);
            this.sendResponse(connection, {
                jsonrpc: '2.0',
                id: request.id,
                result,
            });
        }
        catch (error) {
            logger_1.default.error(`Tool execution error for ${params.name}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const result = {
                content: [{
                        type: 'text',
                        text: `Error executing tool: ${errorMessage}`,
                    }],
                isError: true,
            };
            this.sendResponse(connection, {
                jsonrpc: '2.0',
                id: request.id,
                result,
            });
        }
    }
    async handleResourcesList(connection, request) {
        if (!connection.authenticated) {
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
            return;
        }
        this.sendResponse(connection, {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                resources: [],
            },
        });
    }
    async handleResourcesRead(connection, request) {
        if (!connection.authenticated) {
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
            return;
        }
        this.sendError(connection, request.id, mcp_1.MCPErrorCode.RESOURCE_NOT_FOUND, 'Resource not found');
    }
    async handlePromptsList(connection, request) {
        if (!connection.authenticated) {
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
            return;
        }
        const prompts = await this.toolRegistry.getAvailablePrompts();
        this.sendResponse(connection, {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                prompts,
            },
        });
    }
    async handlePromptsGet(connection, request) {
        if (!connection.authenticated) {
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
            return;
        }
        const params = request.params;
        if (!params || !params.name) {
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.INVALID_PARAMS, 'Missing prompt name');
            return;
        }
        try {
            const messages = await this.toolRegistry.getPrompt(params.name, params.arguments || {});
            this.sendResponse(connection, {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                    messages,
                },
            });
        }
        catch (error) {
            logger_1.default.error(`Prompt execution error for ${params.name}:`, error);
            this.sendError(connection, request.id, mcp_1.MCPErrorCode.INVALID_PROMPT, `Prompt not found: ${params.name}`);
        }
    }
    getConnectionCount() {
        return this.connections.size;
    }
    getConnections() {
        return Array.from(this.connections.values());
    }
    shutdown() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        for (const connectionId of this.connections.keys()) {
            this.removeConnection(connectionId);
        }
        logger_1.default.info('MCP Handler shutdown complete');
    }
}
exports.MCPHandler = MCPHandler;
exports.default = MCPHandler;
//# sourceMappingURL=mcpHandler.js.map