# Sanitize MCP Server

A robust, extensible Model Context Protocol (MCP) server for scanning codebases and projects for secrets and sensitive data using GitLeaks and other tools. Designed for easy integration with Cursor and other MCP clients.

---

## Features
- **scanProject**: Asynchronously scan entire projects for secrets using GitLeaks, with detailed logging.
- **sanitize**: Sanitize text or files for sensitive data (PII, secrets, etc.).
- **readFile/writeFile**: Secure file operations with built-in sanitization.
- **sendToLLM**: Safely send data to LLMs after sanitization.
- **Async, fire-and-forget scanning**: No timeouts, logs progress and findings to a file.

---

## Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/sanitize-mcp.git
cd sanitize-mcp
```

### 2. Install Node.js dependencies
```bash
npm install
```

### 3. Install GitLeaks
- **macOS (Homebrew):**
  ```bash
  brew install gitleaks
  ```
- **Linux/Windows:**
  Download the latest binary from [GitLeaks Releases](https://github.com/gitleaks/gitleaks/releases)

### 4. (Optional) Install Presidio for the sanitize tool
Presidio is required if you want to use the `sanitize` tool (Python 3 required):
- **Install Presidio via pip:**
  ```bash
  pip install presidio-analyzer presidio-anonymizer
  ```
- For more details, see the [Presidio documentation](https://microsoft.github.io/presidio/).

### 5. Start the MCP server
```bash
node server.js
```

### 6. Use with Cursor or MCP client
- Add the server as an MCP server in Cursor or your client.
- Call tools like `scanProject`:
  ```json
  scanProject { "project_path": "/path/to/your/project" }
  ```
- The tool will return a log file path (e.g., `/tmp/scanproject-<timestamp>.log`).

### 7. View scan logs
```bash
tail -f /tmp/scanproject-<timestamp>.log
```

---

## Configuration
- **Exclusions:** By default, `node_modules`, `.git`, `dist`, and `build` are excluded from scans.
- **Log files:** Written to `/tmp/scanproject-<timestamp>.log` by default.
- **Sanitizer:** Input sanitization is enabled by default. You may need to adjust it for certain tool calls.

---

## Dependencies
- Node.js (v16+ recommended)
- [GitLeaks](https://github.com/gitleaks/gitleaks) (v8+ recommended)
- (Optional) Python 3 and Presidio if using the `sanitize` tool

---

## Contributing
1. Fork the repo and create your branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -am 'Add new feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a pull request

---

## License
MIT License. See [LICENSE](LICENSE) for details.

---

## Author
Pooja Madhavan 