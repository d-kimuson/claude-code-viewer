import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scripts = [
  "home.ts",
  "projects.ts", 
  "project-detail.ts",
  "session-detail.ts",
  "error-pages.ts"
];

async function captureAllSnapshots() {
  console.log("🚀 Starting screenshot capture for all pages...\n");
  
  for (const script of scripts) {
    const scriptPath = resolve(__dirname, script);
    console.log(`📸 Capturing: ${script.replace('.ts', '')}...`);
    
    try {
      // Execute each script using tsx
      execSync(`npx tsx "${scriptPath}"`, { 
        stdio: 'inherit',
        cwd: resolve(__dirname, "..", "..")
      });
      console.log(`✅ Completed: ${script.replace('.ts', '')}\n`);
    } catch (error) {
      console.error(`❌ Failed: ${script.replace('.ts', '')} - ${error.message}\n`);
    }
  }
  
  console.log("🎉 All screenshot captures completed!");
}

captureAllSnapshots().catch(console.error);