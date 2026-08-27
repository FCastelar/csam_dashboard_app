import fs from 'node:fs';
import path from 'node:path';
import { parseWorkbook } from '../src/services/parse-workbook';

const PROJECT_ROOT = process.cwd();
const ACCOUNTS_DIR = path.join(PROJECT_ROOT, 'Accounts');
const requestedAccountFile = process.env.ACCOUNT_FILE;
const EXCEL_CANDIDATES = [
  requestedAccountFile ? path.join(ACCOUNTS_DIR, path.basename(requestedAccountFile)) : '',
  path.join(ACCOUNTS_DIR, 'CAF_Account_Executive_View.xlsx'),
  path.join(PROJECT_ROOT, 'data', 'CAF_ROB_Executivo_v2.xlsx'),
  path.join(PROJECT_ROOT, 'CAF_ROB_Executivo_v2.xlsx'),
].filter(Boolean);
const EXCEL_PATH = EXCEL_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ?? EXCEL_CANDIDATES[0];
const OUTPUT_PATH = process.env.ACCOUNT_OUTPUT
  ? path.resolve(PROJECT_ROOT, process.env.ACCOUNT_OUTPUT)
  : path.join(PROJECT_ROOT, 'generated', 'dashboard-data.json');

try {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel not found at ${EXCEL_PATH}`);
  }

  const summary = parseWorkbook(fs.readFileSync(EXCEL_PATH));
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2));
  console.log(`Generated dashboard data at ${OUTPUT_PATH}`);
} catch (error) {
  console.error('Failed to generate dashboard data:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
