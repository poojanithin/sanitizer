import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';

function logLine(logFile, msg) {
  const ts = new Date().toISOString();
  fs.appendFileSync(logFile, `[${ts}] ${msg}\n`);
}

async function runGitLeaks(projectPath, logFile) {
  logLine(logFile, `SCAN START: ${projectPath}`);
  const reportPath = `${os.tmpdir()}/gitleaks-report-${Date.now()}.json`;
  const gitleaks = spawn('gitleaks', [
    'detect',
    '--source', projectPath,
    '--report-format', 'json',
    '--report-path', reportPath
  ]);

  let error = '';

  gitleaks.stderr.on('data', (data) => {
    error += data.toString();
  });

  gitleaks.on('close', (code) => {
    try {
      const findings = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      if (Array.isArray(findings) && findings.length > 0) {
        findings.forEach(finding => {
          logLine(
            logFile,
            `FINDING: ${finding.File}:${finding.StartLine} [${finding.RuleID}] ${finding.Description} (Secret: ${finding.Secret})`
          );
        });
      } else {
        logLine(logFile, 'No secrets found.');
      }
    } catch (e) {
      logLine(logFile, `ERROR: Failed to parse gitleaks output: ${e}`);
    }
    if (code !== 0) {
      logLine(logFile, `ERROR: gitleaks exited with code ${code}. ${error}`);
    }
    logLine(logFile, `SCAN COMPLETE: ${projectPath}`);
    // Optionally, clean up the report file
    try { fs.unlinkSync(reportPath); } catch {}
  });
}

// Entry point
if (process.argv.length < 4) {
  process.exit(1);
}
const projectPath = process.argv[2];
const logFile = process.argv[3];
runGitLeaks(projectPath, logFile); 