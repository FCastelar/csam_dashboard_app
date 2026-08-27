import type { DashboardSource } from './types';
import { isWorkbookName } from './types';

/**
 * Fallback for browsers without the File System Access API.
 *
 * The files live in memory for the session only, so a page reload requires
 * selecting them again.
 */
export const createUploadSource = (files: File[]): DashboardSource => {
  const workbooks = files.filter((file) => isWorkbookName(file.name));

  if (!workbooks.length) {
    throw new Error('NO_WORKBOOKS');
  }

  const label = workbooks.length === 1 ? workbooks[0].name : `${workbooks.length} arquivos`;

  return {
    kind: 'upload',
    label,
    list: async () =>
      workbooks
        .map((file) => ({
          name: file.name,
          lastModified: file.lastModified,
          read: () => file.arrayBuffer(),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
  };
};
