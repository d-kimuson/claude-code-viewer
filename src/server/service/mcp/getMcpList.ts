import { execSync } from "node:child_process";
import { decodeProjectId } from "../project/id";

export interface McpServer {
  name: string;
  command: string;
}

export const getMcpList = async (
  projectId: string,
): Promise<{ servers: McpServer[] }> => {
  try {
    const output = execSync("claude mcp list", {
      encoding: "utf8",
      timeout: 10000,
      cwd: decodeProjectId(projectId),
    });

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

        // Remove status indicators (✓ Connected, ✗ Failed, etc.)
        const command = rest.replace(/\s*-\s*[✓✗].*$/, "").trim();

        if (name && command) {
          servers.push({ name, command });
        }
      }
    }

    return { servers };
  } catch (error) {
    console.error("Failed to get MCP list:", error);
    // Return empty list if command fails
    return { servers: [] };
  }
};
