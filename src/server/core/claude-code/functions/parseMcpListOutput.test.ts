import { describe, expect, it } from "vitest";
import { parseMcpListOutput } from "./parseMcpListOutput";

describe("parseMcpListOutput", () => {
  it("should parse claude mcp list output correctly", async () => {
    const output = `2.0.21 (Claude Code)
Checking MCP server health...

context7: npx -y @upstash/context7-mcp@latest - ✓ Connected
`;

    const result = parseMcpListOutput(output);

    expect(result).toEqual([
      {
        name: "context7",
        command: "npx -y @upstash/context7-mcp@latest",
        status: "connected",
      },
    ]);
  });

  it("should handle multiple MCP servers", async () => {
    const output = `2.0.21 (Claude Code)
Checking MCP server health...

context7: npx -y @upstash/context7-mcp@latest - ✓ Connected
filesystem: /usr/local/bin/mcp-server-fs - ✓ Connected
database: docker run db-mcp - ✗ Failed
`;

    const result = parseMcpListOutput(output);

    expect(result).toEqual([
      {
        name: "context7",
        command: "npx -y @upstash/context7-mcp@latest",
        status: "connected",
      },
      {
        name: "filesystem",
        command: "/usr/local/bin/mcp-server-fs",
        status: "connected",
      },
      {
        name: "database",
        command: "docker run db-mcp",
        status: "failed",
      },
    ]);
  });

  it("should return empty array for output with no MCP servers", async () => {
    const output = `2.0.21 (Claude Code)
Checking MCP server health...

`;

    const result = parseMcpListOutput(output);

    expect(result).toEqual([]);
  });

  it("should skip malformed lines", async () => {
    const output = `2.0.21 (Claude Code)
Checking MCP server health...

context7: npx -y @upstash/context7-mcp@latest - ✓ Connected
invalid line without colon
: command without name
name without command:
`;

    const result = parseMcpListOutput(output);

    expect(result).toEqual([
      {
        name: "context7",
        command: "npx -y @upstash/context7-mcp@latest",
        status: "connected",
      },
    ]);
  });
});
