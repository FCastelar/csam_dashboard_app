import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const ACCOUNTS_DIR = path.join(PROJECT_ROOT, 'Accounts');
const EXCEL_CANDIDATES = [
  path.join(ACCOUNTS_DIR, 'CAF_Account_Executive_View.xlsx'),
  path.join(PROJECT_ROOT, 'data', 'CAF_ROB_Executivo_v2.xlsx'),
  path.join(PROJECT_ROOT, 'CAF_ROB_Executivo_v2.xlsx'),
];
const EXCEL_PATH = EXCEL_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ?? EXCEL_CANDIDATES[0];
const accountFiles = () => fs.existsSync(ACCOUNTS_DIR)
  ? fs.readdirSync(ACCOUNTS_DIR).filter((file) => /\.xlsx$/i.test(file) && !file.startsWith('~$')).map((file) => path.join(ACCOUNTS_DIR, file))
  : [];

const runGenerator = (accountFile?: string, outputPath?: string) => {
  const tsxCli = path.resolve(PROJECT_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const child = spawn(process.execPath, [tsxCli, 'scripts/generate-dashboard-data.ts'], {
    cwd: PROJECT_ROOT,
    env: accountFile ? { ...process.env, ACCOUNT_FILE: path.basename(accountFile), ACCOUNT_OUTPUT: outputPath } : process.env,
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error('Data generation failed.');
    }
  });
};

const accountOutput = (file: string) => path.join('generated', 'accounts', `${path.basename(file, path.extname(file))}.json`);
const generateAccount = (file: string) => {
  runGenerator(file, accountOutput(file));
  if (/^CAF_Account_Executive_View\.xlsx$/i.test(path.basename(file))) runGenerator();
};

const initialFiles = accountFiles();
const exists = initialFiles.length > 0 || fs.existsSync(EXCEL_PATH);
if (!exists) {
  console.warn(`No Excel files found in ${ACCOUNTS_DIR}. Add a workbook and rerun watch-data.`);
}

if (initialFiles.length) initialFiles.forEach(generateAccount);
else runGenerator();
const delayMs = 1500;
let lastModified = new Map(initialFiles.map((file) => [file, fs.statSync(file).mtimeMs]));

setInterval(() => {
  const currentFiles = accountFiles();
  const currentFileSet = new Set(currentFiles);
  currentFiles.forEach((file) => {
    const current = fs.statSync(file).mtimeMs;
    if (current !== lastModified.get(file)) {
      lastModified.set(file, current);
      console.log(`Excel updated (${path.basename(file)}). Regenerating dashboard data...`);
      generateAccount(file);
    }
  });
  Array.from(lastModified.keys()).filter((file) => !currentFileSet.has(file)).forEach((file) => lastModified.delete(file));
}, delayMs);

console.log(`Watching ${ACCOUNTS_DIR} for account workbook changes...`);
