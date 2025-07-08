import { EventEmitter } from 'events';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import config from './config/index';
import logger from './utils/logger';
import { CanvasToolRegistry } from './canvasTools';
import {
  MCPMessage,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPTool,
  MCPToolResult,
  MCPPrompt,
  MCPResource,
  MCPErrorCode,
  MCPServerCapabilities,
  SSEConnection,
  SSEMessage,
  MCPMethod,
  MCPInitializeParams,
  MCPInitializeResult
} from './types/mcp';
import { CanvasAPIClient } from './canvasClient';

export class MCPHandler extends EventEmitter {
  private connections: Map<string, SSEConnection> = new Map();
  private toolRegistry: CanvasToolRegistry;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.toolRegistry = new CanvasToolRegistry();
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.cleanupStaleConnections();
      this.sendHeartbeat();
    }, config.mcp.heartbeatInterval);
  }

  private cleanupStaleConnections(): void {
    const now = new Date();
    const timeout = config.mcp.connectionTimeout;

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
      
      if (timeSinceLastActivity > timeout) {
        logger.info(`Cleaning up stale connection: ${connectionId}`);
        this.removeConnection(connectionId);
      }
    }
  }

  private sendHeartbeat(): void {
    const heartbeatMessage: MCPNotification = {
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

  public addConnection(connectionId: string, response: any): void {
    if (this.connections.size >= config.mcp.maxConnections) {
      logger.warn(`Maximum connections reached (${config.mcp.maxConnections}), rejecting new connection`);
      response.status(503).json({ error: 'Maximum connections reached' });
      return;
    }

    const connection: SSEConnection = {
      id: connectionId,
      response,
      authenticated: false,
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connection);
    logger.info(`New MCP connection established: ${connectionId}`);

    // Set up SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection message
    this.sendMessage(connection, {
      jsonrpc: '2.0',
      method: 'notifications/message',
      params: {
        level: 'info',
        message: 'Connected to Canvas LMS MCP Server',
      },
    });

    // Handle connection close
    response.on('close', () => {
      this.removeConnection(connectionId);
    });

    response.on('error', (error: Error) => {
      logger.error(`SSE connection error for ${connectionId}:`, error);
      this.removeConnection(connectionId);
    });
  }

  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.response.end();
      } catch (error) {
        logger.debug(`Error closing connection ${connectionId}:`, error);
      }
      this.connections.delete(connectionId);
      logger.info(`MCP connection closed: ${connectionId}`);
    }
  }

  private sendMessage(connection: SSEConnection, message: MCPMessage): void {
    try {
      const sseMessage: SSEMessage = {
        id: uuidv4(),
        data: JSON.stringify(message),
      };

      let sseData = `id: ${sseMessage.id}\n`;
      if (sseMessage.event) {
        sseData += `event: ${sseMessage.event}\n`;
      }
      sseData += `data: ${sseMessage.data}\n\n`;

      connection.response.write(sseData);
      connection.lastActivity = new Date();
    } catch (error) {
      logger.error(`Failed to send message to connection ${connection.id}:`, error);
      this.removeConnection(connection.id);
    }
  }

  private sendResponse(connection: SSEConnection, response: MCPResponse): void {
    this.sendMessage(connection, response);
  }

  private sendError(connection: SSEConnection, id: string | number | undefined, code: MCPErrorCode, message: string, data?: any): void {
    const errorResponse: MCPResponse = {
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

  public async handleMessage(connectionId: string, messageData: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn(`Received message for unknown connection: ${connectionId}`);
      return;
    }

    connection.lastActivity = new Date();

    try {
      const message: MCPMessage = JSON.parse(messageData);
      
      if (!this.isValidMCPMessage(message)) {
        this.sendError(connection, (message as any)?.id, MCPErrorCode.INVALID_REQUEST, 'Invalid MCP message format');
        return;
      }

      if (message.method) {
        // This is a request
        await this.handleRequest(connection, message as MCPRequest);
      } else if (message.result !== undefined || message.error !== undefined) {
        // This is a response - typically not expected from client in our use case
        logger.debug(`Received response from client ${connectionId}:`, message);
      }
    } catch (error) {
      logger.error(`Failed to parse message from ${connectionId}:`, error);
      this.sendError(connection, undefined, MCPErrorCode.PARSE_ERROR, 'Failed to parse JSON message');
    }
  }

  private isValidMCPMessage(message: any): message is MCPMessage {
    return (
      message &&
      typeof message === 'object' &&
      message.jsonrpc === '2.0' &&
      (message.method || message.result !== undefined || message.error !== undefined)
    );
  }

  private async handleRequest(connection: SSEConnection, request: MCPRequest): Promise<void> {
    try {
      switch (request.method) {
        case MCPMethod.INITIALIZE:
          await this.handleInitialize(connection, request);
          break;
        case MCPMethod.INITIALIZED:
          await this.handleInitialized(connection, request);
          break;
        case MCPMethod.PING:
          await this.handlePing(connection, request);
          break;
        case MCPMethod.TOOLS_LIST:
          await this.handleToolsList(connection, request);
          break;
        case MCPMethod.TOOLS_CALL:
          await this.handleToolsCall(connection, request);
          break;
        case MCPMethod.RESOURCES_LIST:
          await this.handleResourcesList(connection, request);
          break;
        case MCPMethod.RESOURCES_READ:
          await this.handleResourcesRead(connection, request);
          break;
        case MCPMethod.PROMPTS_LIST:
          await this.handlePromptsList(connection, request);
          break;
        case MCPMethod.PROMPTS_GET:
          await this.handlePromptsGet(connection, request);
          break;
        default:
          this.sendError(connection, request.id, MCPErrorCode.METHOD_NOT_FOUND, `Method not found: ${request.method}`);
      }
    } catch (error) {
      logger.error(`Error handling request ${request.method}:`, error);
      this.sendError(connection, request.id, MCPErrorCode.INTERNAL_ERROR, 'Internal server error');
    }
  }

  private async handleInitialize(connection: SSEConnection, request: MCPRequest): Promise<void> {
    const params = request.params as MCPInitializeParams;
    
    if (!params || !params.protocolVersion || !params.clientInfo) {
      this.sendError(connection, request.id, MCPErrorCode.INVALID_PARAMS, 'Missing required initialization parameters');
      return;
    }

    // Store client info
    connection.clientInfo = params.clientInfo;
    connection.capabilities = params.capabilities;

    const result: MCPInitializeResult = {
      protocolVersion: config.mcp.protocolVersion,
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: false, listChanged: true },
        prompts: { listChanged: true },
        logging: {},
      },
      serverInfo: {
        name: config.mcp.serverName,
        version: config.mcp.serverVersion,
        protocolVersion: config.mcp.protocolVersion,
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
      id: request.id!,
      result,
    });

    logger.info(`Client initialized: ${params.clientInfo.name} v${params.clientInfo.version}`);
  }

  private async handleInitialized(connection: SSEConnection, request: MCPRequest): Promise<void> {
    connection.authenticated = true;
    logger.info(`Connection ${connection.id} is now initialized and ready`);
  }

  private async handlePing(connection: SSEConnection, request: MCPRequest): Promise<void> {
    this.sendResponse(connection, {
      jsonrpc: '2.0',
      id: request.id!,
      result: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  private async handleToolsList(connection: SSEConnection, request: MCPRequest): Promise<void> {
    if (!connection.authenticated) {
      this.sendError(connection, request.id, MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
      return;
    }

    const tools = await this.toolRegistry.getAvailableTools();
    
    this.sendResponse(connection, {
      jsonrpc: '2.0',
      id: request.id!,
      result: {
        tools,
      },
    });
  }

  private async handleToolsCall(connection: SSEConnection, request: MCPRequest): Promise<void> {
    if (!connection.authenticated) {
      this.sendError(connection, request.id, MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
      return;
    }

    const params = request.params as { name: string; arguments: Record<string, any> };
    
    if (!params || !params.name) {
      this.sendError(connection, request.id, MCPErrorCode.INVALID_PARAMS, 'Missing tool name');
      return;
    }

    try {
      // Extract Canvas access token from arguments
      const accessToken = params.arguments?.access_token;
      if (!accessToken) {
        this.sendError(connection, request.id, MCPErrorCode.AUTHENTICATION_ERROR, 'Canvas access token required');
        return;
      }

      // Create Canvas client
      const canvasClient = new CanvasAPIClient(accessToken);
      
      // Validate token
      const isValidToken = await canvasClient.validateToken();
      if (!isValidToken) {
        this.sendError(connection, request.id, MCPErrorCode.AUTHENTICATION_ERROR, 'Invalid Canvas access token');
        return;
      }

      // Execute tool
      const result = await this.toolRegistry.executeTool(params.name, params.arguments, canvasClient);
      
      this.sendResponse(connection, {
        jsonrpc: '2.0',
        id: request.id!,
        result,
      });
    } catch (error) {
      logger.error(`Tool execution error for ${params.name}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: MCPToolResult = {
        content: [{
          type: 'text',
          text: `Error executing tool: ${errorMessage}`,
        }],
        isError: true,
      };
      
      this.sendResponse(connection, {
        jsonrpc: '2.0',
        id: request.id!,
        result,
      });
    }
  }

  private async handleResourcesList(connection: SSEConnection, request: MCPRequest): Promise<void> {
    if (!connection.authenticated) {
      this.sendError(connection, request.id, MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
      return;
    }

    // For now, return empty resources list
    // This could be extended to provide Canvas resources like course content, files, etc.
    this.sendResponse(connection, {
      jsonrpc: '2.0',
      id: request.id!,
      result: {
        resources: [],
      },
    });
  }

  private async handleResourcesRead(connection: SSEConnection, request: MCPRequest): Promise<void> {
    if (!connection.authenticated) {
      this.sendError(connection, request.id, MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
      return;
    }

    this.sendError(connection, request.id, MCPErrorCode.RESOURCE_NOT_FOUND, 'Resource not found');
  }

  private async handlePromptsList(connection: SSEConnection, request: MCPRequest): Promise<void> {
    if (!connection.authenticated) {
      this.sendError(connection, request.id, MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
      return;
    }

    const prompts = await this.toolRegistry.getAvailablePrompts();
    
    this.sendResponse(connection, {
      jsonrpc: '2.0',
      id: request.id!,
      result: {
        prompts,
      },
    });
  }

  private async handlePromptsGet(connection: SSEConnection, request: MCPRequest): Promise<void> {
    if (!connection.authenticated) {
      this.sendError(connection, request.id, MCPErrorCode.AUTHENTICATION_ERROR, 'Connection not authenticated');
      return;
    }

    const params = request.params as { name: string; arguments?: Record<string, any> };
    
    if (!params || !params.name) {
      this.sendError(connection, request.id, MCPErrorCode.INVALID_PARAMS, 'Missing prompt name');
      return;
    }

    try {
      const messages = await this.toolRegistry.getPrompt(params.name, params.arguments || {});
      
      this.sendResponse(connection, {
        jsonrpc: '2.0',
        id: request.id!,
        result: {
          messages,
        },
      });
    } catch (error) {
      logger.error(`Prompt execution error for ${params.name}:`, error);
      this.sendError(connection, request.id, MCPErrorCode.INVALID_PROMPT, `Prompt not found: ${params.name}`);
    }
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getConnections(): SSEConnection[] {
    return Array.from(this.connections.values());
  }

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all connections
    for (const connectionId of this.connections.keys()) {
      this.removeConnection(connectionId);
    }

    logger.info('MCP Handler shutdown complete');
  }
}

export default MCPHandler;

