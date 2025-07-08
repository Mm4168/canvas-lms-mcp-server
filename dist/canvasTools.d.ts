import { MCPTool, MCPToolResult, MCPPrompt, MCPPromptMessage } from './types/mcp';
import { CanvasAPIClient } from './canvasClient';
export declare class CanvasToolRegistry {
    private tools;
    private prompts;
    constructor();
    private initializeTools;
    private initializePrompts;
    private registerTool;
    private registerPrompt;
    getAvailableTools(): Promise<MCPTool[]>;
    getAvailablePrompts(): Promise<MCPPrompt[]>;
    executeTool(toolName: string, args: Record<string, any>, canvasClient: CanvasAPIClient): Promise<MCPToolResult>;
    getPrompt(promptName: string, args: Record<string, any>): Promise<MCPPromptMessage[]>;
}
export default CanvasToolRegistry;
//# sourceMappingURL=canvasTools.d.ts.map