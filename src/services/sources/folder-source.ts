import { clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle } from './handle-store';
import type {
  AccountFile,
  DashboardSource,
  DirectoryHandleLike,
  DirectoryPickerWindow,
  FileHandleLike,
} from './types';
import { isWorkbookName } from './types';

export const supportsFolderSource = (): boolean =>
  typeof window !== 'undefined' &&
  typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function' &&
  window.isSecureContext;

const readPermission = async (
  handle: DirectoryHandleLike,
  request: boolean,
): Promise<PermissionState> => {
  const options = { mode: 'read' as const };
  const current = (await handle.queryPermission?.(options)) ?? 'granted';
  if (current === 'granted' || !request) return current;
  return (await handle.requestPermission?.(options)) ?? 'denied';
};

const createSource = (handle: DirectoryHandleLike): DashboardSource => ({
  kind: 'folder',
  label: handle.name,
  list: async () => {
    const files: AccountFile[] = [];

    for await (const entry of handle.values()) {
      if (entry.kind !== 'file' || !isWorkbookName(entry.name)) continue;

      const fileHandle = entry as FileHandleLike;
      // `getFile()` hydrates OneDrive "files on-demand" placeholders, so it can
      // fail while offline. Skipping keeps the remaining accounts usable.
      try {
        const file = await fileHandle.getFile();
        files.push({
          name: file.name,
          lastModified: file.lastModified,
          read: async () => (await fileHandle.getFile()).arrayBuffer(),
        });
      } catch (error) {
        console.warn(`Unable to read ${entry.name} from the selected folder`, error);
      }
    }

    return files.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Opens the picker. Must be called from a user gesture. */
export const pickFolderSource = async (): Promise<DashboardSource> => {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error('UNSUPPORTED');

  const handle = await picker({ id: 'csam-dash-accounts', mode: 'read' });
  if ((await readPermission(handle, true)) !== 'granted') {
    throw new Error('PERMISSION_DENIED');
  }

  await saveDirectoryHandle(handle);
  return createSource(handle);
};

/**
 * Restores a previously chosen folder.
 *
 * With `request: false` this stays silent for browsers that already granted
 * access; otherwise the caller must invoke it from a user gesture because the
 * permission prompt requires one.
 */
export const restoreFolderSource = async (request: boolean): Promise<DashboardSource | null> => {
  if (!supportsFolderSource()) return null;

  const handle = await loadDirectoryHandle();
  if (!handle) return null;

  try {
    if ((await readPermission(handle, request)) !== 'granted') return null;
    return createSource(handle);
  } catch (error) {
    console.warn('Unable to restore access to the selected folder', error);
    return null;
  }
};

export const hasStoredFolder = async (): Promise<boolean> => (await loadDirectoryHandle()) !== null;

export const forgetFolderSource = clearDirectoryHandle;
