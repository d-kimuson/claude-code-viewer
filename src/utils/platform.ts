import { execSync } from "node:child_process";
import { platform } from "node:os";

export function findCommandPath(command: string): string {
  try {
    if (platform() === "win32") {
      const result = execSync(`where ${command}`, { 
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      const lines = result.trim().split("\n");
      return lines[0] || "";
    } else {
      const result = execSync(`which ${command}`, { 
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      return result.trim();
    }
  } catch (error) {
    throw new Error(`Command ${command} not found: ${error}`);
  }
}
