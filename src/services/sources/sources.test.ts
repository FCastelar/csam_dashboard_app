import { describe, expect, it } from 'vitest';
import { isWorkbookName } from './types';
import { createUploadSource } from './upload-source';

describe('workbook discovery', () => {
  it('accepts account workbooks regardless of extension casing', () => {
    expect(isWorkbookName('CAF_Account_Executive_View.xlsx')).toBe(true);
    expect(isWorkbookName('BHP_Account_Executive_View.XLSX')).toBe(true);
  });

  it('ignores Excel lock files and unrelated formats', () => {
    expect(isWorkbookName('~$CAF_Account_Executive_View.xlsx')).toBe(false);
    expect(isWorkbookName('notes.txt')).toBe(false);
    expect(isWorkbookName('legacy.xls')).toBe(false);
  });
});

describe('upload source', () => {
  const asFile = (name: string) => new File(['x'], name);

  it('keeps only workbooks and reports how many were loaded', async () => {
    const source = createUploadSource([
      asFile('CAF_Account_Executive_View.xlsx'),
      asFile('~$CAF_Account_Executive_View.xlsx'),
      asFile('readme.txt'),
      asFile('BHP_Account_Executive_View.xlsx'),
    ]);

    const files = await source.list();
    expect(files.map((file) => file.name)).toEqual([
      'BHP_Account_Executive_View.xlsx',
      'CAF_Account_Executive_View.xlsx',
    ]);
    expect(source.label).toBe('2 arquivos');
  });

  it('fails when the selection has no workbook', () => {
    expect(() => createUploadSource([asFile('readme.txt')])).toThrow('NO_WORKBOOKS');
  });
});
