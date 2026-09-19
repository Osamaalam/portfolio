export interface McpConnection {
  id: string;
  controller: ReadableStreamDefaultController;
  createdAt: number;
}

export interface McpLogItem {
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "rpc_in" | "rpc_out";
  message: string;
}

// Global registry object that persists across Next.js Hot Module Reloads (HMR)
const globalForMcp = globalThis as unknown as {
  mcpConnections?: Map<string, McpConnection>;
  mcpLogControllers?: Set<ReadableStreamDefaultController>;
};

if (!globalForMcp.mcpConnections) {
  globalForMcp.mcpConnections = new Map();
}

if (!globalForMcp.mcpLogControllers) {
  globalForMcp.mcpLogControllers = new Set();
}

export const mcpConnections = globalForMcp.mcpConnections;
export const mcpLogControllers = globalForMcp.mcpLogControllers;

// Broadcast a live transaction log to any open website dashboards
export function broadcastMcpLog(
  type: McpLogItem["type"],
  message: string
) {
  const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
  const logItem: McpLogItem = { timestamp, type, message };
  const chunk = `data: ${JSON.stringify(logItem)}\n\n`;

  mcpLogControllers.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(chunk));
    } catch (e) {
      // Remove dead browser controllers
      mcpLogControllers.delete(controller);
    }
  });
}
