export type McpServerStatus = "connected" | "failed" | "unknown";

export interface McpServer {
  name: string;
  command: string;
  status: McpServerStatus;
}

export const parseMcpListOutput = (output: string) => {
  const servers: McpServer[] = [];
  const lines = output.trim().split("\n");

  for (const line of lines) {
    // Skip header lines and status indicators
    if (line.includes("Checking MCP server health") || line.trim() === "") {
      continue;
    }

    // Parse lines like "context7: npx -y @upstash/context7-mcp@latest - ✓ Connected"
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const name = line.substring(0, colonIndex).trim();
      const rest = line.substring(colonIndex + 1).trim();

      // Extract status from indicators (✓ Connected, ✗ Failed, etc.)
      let status: McpServerStatus = "unknown";
      if (rest.includes("✓") || rest.toLowerCase().includes("connected")) {
        status = "connected";
      } else if (rest.includes("✗") || rest.toLowerCase().includes("failed")) {
        status = "failed";
      }

      // Remove status indicators to get clean command
      const command = rest.replace(/\s*-\s*[✓✗].*$/, "").trim();

      if (name && command) {
        servers.push({ name, command, status });
      }
    }
  }

  return servers;
};
