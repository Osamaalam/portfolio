import { mcpConnections, broadcastMcpLog } from "@/lib/mcpRegistry";

export async function GET(request: Request) {
  const sessionId = "mcp-" + Math.random().toString(36).substring(2, 11);

  const stream = new ReadableStream({
    start(controller) {
      // Register SSE Connection in Memory Registry
      mcpConnections.set(sessionId, {
        id: sessionId,
        controller,
        createdAt: Date.now()
      });

      console.log(`[MCP Server] Client established session '${sessionId}' via SSE`);
      broadcastMcpLog("info", `[Session ${sessionId}] SSE Channel handshake established.`);

      // Send standard MCP spec "endpoint" event informing client where to send POST messages
      const endpointChunk = `event: endpoint\ndata: /api/mcp/message?sessionId=${sessionId}\n\n`;
      controller.enqueue(new TextEncoder().encode(endpointChunk));
      
      broadcastMcpLog("rpc_out", `[Session ${sessionId}] Broadcasted active POST endpoint: /api/mcp/message?sessionId=${sessionId}`);

      // Setup a periodic heartbeat keep-alive comment every 15s to keep proxy channels open
      const intervalId = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`:keep-alive\n\n`));
        } catch (e) {
          clearInterval(intervalId);
        }
      }, 15000);

      // Store interval handle on controller state so we can clean it up upon close
      (controller as any)._keepAliveInterval = intervalId;
    },
    cancel() {
      // Cleanup connection
      const conn = mcpConnections.get(sessionId);
      if (conn) {
        const intervalId = (conn.controller as any)._keepAliveInterval;
        if (intervalId) clearInterval(intervalId);
      }
      mcpConnections.delete(sessionId);
      console.log(`[MCP Server] Client session '${sessionId}' closed`);
      broadcastMcpLog("warning", `[Session ${sessionId}] Client disconnected. Closed SSE thread.`);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no" // Disable Nginx stream buffering (crucial for SSE in prod!)
    }
  });
}
export const dynamic = "force-dynamic";
