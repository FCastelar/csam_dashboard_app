import { clearFileHandles, loadFileHandles, saveFileHandles } from './handle-store';
import type { AccountFile, DashboardSource, FileHandleLike, FilePickerWindow } from './types';
import { isWorkbookName } from './types';

export const supportsFileSource = (): boolean =>
  typeof window !== 'undefined' &&
  typeof (window as FilePickerWindow).showOpenFilePicker === 'function' &&
  window.isSecureContext;

const readPermission = async (handle: FileHandleLike, request: boolean): Promise<PermissionState> => {
  const options = { mode: 'read' as const };
  const current = (await handle.queryPermission?.(options)) ?? 'granted';
  if (current === 'granted' || !request) return current;
  return (await handle.requestPermission?.(options)) ?? 'denied';
};

const createSource = (handles: FileHandleLike[]): DashboardSource => ({
  kind: 'file',
  label: handles.length === 1 ? handles[0].name : `${handles.length} arquivos`,
  // `getFile()` is called on every listing so edits saved to disk are picked up.
  list: async () => {
    const files: AccountFile[] = [];

    for (const handle of handles) {
      try {
        const file = await handle.getFile();
        files.push({
          name: file.name,
          lastModified: file.lastModified,
          read: async () => (await handle.getFile()).arrayBuffer(),
        });
      } catch (error) {
        console.warn(`Unable to read ${handle.name}`, error);
      }
    }

    return files.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Opens the file picker. Must be called from a user gesture. */
export const pickFileSource = async (): Promise<DashboardSource> => {
  const picker = (window as FilePickerWindow).showOpenFilePicker;
  if (!picker) throw new Error('UNSUPPORTED');

  const handles = await picker({
    id: 'csam-dash-workbooks',
    multiple: true,
    types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
  });

  const workbooks = handles.filter((handle) => isWorkbookName(handle.name));
  if (!workbooks.length) throw new Error('NO_WORKBOOKS');

  for (const handle of workbooks) {
    if ((await readPermission(handle, true)) !== 'granted') {
      throw new Error('PERMISSION_DENIED');
    }
  }

  await saveFileHandles(workbooks);
  return createSource(workbooks);
};

/** Rebuilds a source from handles saved in a previous session. */
export const restoreFileSource = async (request: boolean): Promise<DashboardSource | null> => {
  if (!supportsFileSource()) return null;

  const handles = await loadFileHandles();
  if (!handles.length) return null;

  try {
    for (const handle of handles) {
      if ((await readPermission(handle, request)) !== 'granted') return null;
    }
    return createSource(handles);
  } catch (error) {
    console.warn('Unable to restore access to the selected files', error);
    return null;
  }
};

export const hasStoredFiles = async (): Promise<boolean> => (await loadFileHandles()).length > 0;

export const forgetFileSource = clearFileHandles;

/**
 * Converts a drop event into persistable handles when the browser supports it,
 * so dragged workbooks behave like picked ones.
 */
export const handlesFromDrop = async (items: DataTransferItemList): Promise<FileHandleLike[]> => {
  if (!supportsFileSource()) return [];

  const handles: FileHandleLike[] = [];

  for (const item of Array.from(items)) {
    const getHandle = (item as DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileHandleLike | null> })
      .getAsFileSystemHandle;
    if (typeof getHandle !== 'function') return [];

    try {
      const handle = await getHandle.call(item);
      if (handle && handle.kind === 'file' && isWorkbookName(handle.name)) handles.push(handle);
    } catch (error) {
      console.warn('Unable to read a dropped item as a handle', error);
      return [];
    }
  }

  return handles;
};

/** Persists handles obtained from a drop so the selection survives reloads. */
export const adoptFileHandles = async (handles: FileHandleLike[]): Promise<DashboardSource> => {
  if (!handles.length) throw new Error('NO_WORKBOOKS');
  await saveFileHandles(handles);
  return createSource(handles);
};
