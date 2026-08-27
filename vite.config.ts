import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const generatorScript = fileURLToPath(new URL('./scripts/generate-dashboard-data.ts', import.meta.url));

const runDataGeneration = () => new Promise<void>((resolve, reject) => {
  const cliPath = path.resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const child = spawn(process.execPath, [cliPath, generatorScript], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`Data generation exited with code ${code ?? 'unknown'}`));
  });
});

const accountsDirectory = path.resolve(process.cwd(), 'Accounts');
const generatedDirectory = path.resolve(process.cwd(), 'generated');
const accountFiles = () => fs.existsSync(accountsDirectory) ? fs.readdirSync(accountsDirectory).filter((file) => /\.xlsx$/i.test(file)) : [];
const generateForAccount = (accountFile: string) => new Promise<void>((resolve, reject) => {
  const cliPath = path.resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const child = spawn(process.execPath, [cliPath, generatorScript], {
    cwd: process.cwd(),
    env: { ...process.env, ACCOUNT_FILE: path.basename(accountFile), ACCOUNT_OUTPUT: path.join('generated', 'accounts', `${path.basename(accountFile, path.extname(accountFile))}.json`) },
    stdio: 'inherit',
    shell: false,
  });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Data generation exited with code ${code ?? 'unknown'}`)));
});

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // The dashboard reads local spreadsheets only. Blocking every outbound
  // connection makes accidental exfiltration impossible, not just unlikely.
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

export default defineConfig({
  // GitHub Pages serves project sites from /<repo>/, so the base is injected at build time.
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    {
      // Applied only to the production build so the dev server keeps its HMR socket.
      name: 'inject-csp',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
        ),
    },
    react(),
    {
      name: 'dashboard-refresh-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/accounts', (req, res) => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(accountFiles()));
        });
        server.middlewares.use('/api/account-data', async (req, res) => {
          const accountFile = new URL(req.url ?? '/', 'http://localhost').searchParams.get('account');
          if (!accountFile || !accountFiles().includes(path.basename(accountFile))) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, message: 'Invalid account file' }));
            return;
          }
          try {
            await generateForAccount(accountFile);
            const outputPath = path.resolve(generatedDirectory, 'accounts', `${path.basename(accountFile, path.extname(accountFile))}.json`);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(fs.readFileSync(outputPath));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : 'Failed to load account data' }));
          }
        });
        server.middlewares.use('/api/refresh-data', async (req, res, next) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }));
            return;
          }

          try {
            const accountFile = new URL(req.url ?? '/', 'http://localhost').searchParams.get('account');
            if (accountFile && accountFiles().includes(path.basename(accountFile))) await generateForAccount(accountFile);
            else await runDataGeneration();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, message: 'Dashboard data refreshed from Excel' }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              ok: false,
              message: error instanceof Error ? error.message : 'Failed to regenerate dashboard data',
            }));
          }
        });
      },
    },
  ],
  server: {
    port: 5173,
    // Loopback only: the dev endpoints expose parsed customer data.
    host: 'localhost',
  },
  preview: {
    port: 4173,
    host: 'localhost',
  },
});
