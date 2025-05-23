import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "child_process";
import fs from 'fs/promises';
import path from 'path';
import { readdirSync, statSync } from 'fs';
import fsLog from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = new McpServer({
  name: "Sanitizer",
  version: "1.0.0"
});

// Single source of truth for Python process
async function callPythonSanitizer(text) {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", [path.join(__dirname, "sanitize.py")]);
    let result = "";
    let error = "";

    py.stdout.on("data", (data) => {
      result += data.toString();
    });

    py.stderr.on("data", (data) => {
      error += data.toString();
    });

    py.on("close", () => {
      try {
        const output = JSON.parse(result.trim().split("\n").pop());
        resolve(output);
      } catch (e) {
        resolve({ 
          sanitized: text, 
          original: text, 
          error: error || "Error parsing output",
          detected_entities: []
        });
      }
    });

    py.stdin.write(JSON.stringify({ text }) + "\n");
    py.stdin.end();
  });
}

// Unified middleware for scanning and sanitizing
function withScanAndSanitize(toolFn) {
  return async (args) => {
    // Scan inputs
    for (const key in args) {
      if (typeof args[key] === 'string') {
        const scanResult = await callPythonSanitizer(args[key]);
        
        if (scanResult.detected_entities?.length > 0) {
          const detectedTypes = [...new Set(scanResult.detected_entities.map(e => e.type))].join(', ');
          return {
            content: [{
              type: 'text',
              text: `[Sensitive Data Detected] Your request contains sensitive information (${detectedTypes}) and has been cancelled.`
            }]
          };
        }
        args[key] = scanResult.sanitized;
      }
    }
    
    // Execute tool
    let result = await toolFn(args);
    
    // Sanitize outputs
    if (result?.content) {
      for (const item of result.content) {
        if (item.type === 'text' && typeof item.text === 'string') {
          const scanResult = await callPythonSanitizer(item.text);
          if (scanResult.detected_entities?.length > 0) {
            const detectedTypes = [...new Set(scanResult.detected_entities.map(e => e.type))].join(', ');
            return {
              content: [{
                type: 'text',
                text: `[Sensitive Data Detected in Output] The tool's response contains sensitive information (${detectedTypes}) and has been blocked.`
              }]
            };
          }
          item.text = scanResult.sanitized;
        }
      }
    }
    return result;
  };
}

// File utilities
async function readFileSanitized(path, encoding = 'utf-8') {
  const content = await fs.readFile(path, encoding);
  return callPythonSanitizer(content);
}

async function writeFileSanitized(path, data, encoding = 'utf-8') {
  const result = await callPythonSanitizer(data);
  await fs.writeFile(path, result.sanitized, encoding);
  return result;
}

// Helper to recursively walk a directory
function walkDir(dir) {
  let results = [];
  const list = readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = statSync(filePath);
    if (stat?.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

function logToFile(msg) {
  try {
    fsLog.appendFileSync('/tmp/scanproject.log', msg + '\n');
  } catch (e) {
    // Ignore file write errors
  }
  // Do NOT use console.log here!
}

// Tool registrations
server.tool(
  "sanitize",
  { text: z.string() },
  withScanAndSanitize(async ({ text }) => {
    const result = await callPythonSanitizer(text);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  })
);

server.tool(
  "readFile",
  { path: z.string() },
  withScanAndSanitize(async ({ path }) => {
    const result = await readFileSanitized(path);
    return { content: [{ type: "text", text: result.sanitized }] };
  })
);

server.tool(
  "writeFile",
  { path: z.string(), data: z.string() },
  withScanAndSanitize(async ({ path, data }) => {
    await writeFileSanitized(path, data);
    return { content: [{ type: "text", text: `File ${path} written successfully.` }] };
  })
);

server.tool(
  "sendToLLM",
  { data: z.string() },
  withScanAndSanitize(async ({ data }) => {
    return { content: [{ type: "text", text: "" }] };
  })
);

server.tool(
  "scanProject",
  { project_path: z.string() },
  async ({ project_path }) => {
    const timestamp = Date.now();
    const logFile = `/tmp/scanproject-${timestamp}.log`;
    const backgroundScript = path.join(__dirname, 'backgroundScan.js');

    // Start background scan as a detached child process
    const child = spawn(
      'node',
      [backgroundScript, project_path, logFile],
      {
        detached: true,
        stdio: 'ignore'
      }
    );
    child.unref();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "scan_started",
          log_file: logFile
        })
      }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);