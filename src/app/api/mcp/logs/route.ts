import { mcpLogControllers } from "@/lib/mcpRegistry";

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      // Register this browser listener in the logs Set
      mcpLogControllers.add(controller);
      console.log(`[MCP Server] Browser registered for real-time traffic log streams.`);

      // Send initial connection successful handshake event
      const initItem = {
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        type: "success",
        message: "Successfully connected to real-time MCP Log socket. Awaiting agent handshakes..."
      };
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(initItem)}\n\n`));
    },
    cancel(controller) {
      // Remove when connection closes
      mcpLogControllers.delete(controller as any);
      console.log(`[MCP Server] Browser log stream disconnected.`);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  });
}
export const dynamic = "force-dynamic";
