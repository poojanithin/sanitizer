import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"]
});

const client = new Client({
  name: "example-client",
  version: "1.0.0"
});

async function main() {
  await client.connect(transport);

  // Call the scanProject tool
  console.log("Starting project scan...");
  const scanResult = await client.callTool({
    name: "scanProject",
    arguments: {
      root: "."  // Scan current directory
    }
  });

  console.log("Scan result:", scanResult.content[0].text);

  // No disconnect needed
}

main(); 