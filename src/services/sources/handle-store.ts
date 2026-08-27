import type { DirectoryHandleLike } from './types';

/**
 * Persists the chosen directory handle so returning users only have to
 * re-grant permission instead of picking the folder again.
 *
 * The handle is a permission-scoped pointer: it carries no workbook content.
 */
const DB_NAME = 'csam-dash';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'accounts-directory';

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'));
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  } finally {
    db.close();
  }
};

export const saveDirectoryHandle = async (handle: DirectoryHandleLike): Promise<void> => {
  try {
    await withStore('readwrite', (store) => store.put(handle, HANDLE_KEY) as IDBRequest<IDBValidKey>);
  } catch (error) {
    console.warn('Unable to persist the folder selection', error);
  }
};

export const loadDirectoryHandle = async (): Promise<DirectoryHandleLike | null> => {
  try {
    const handle = await withStore<DirectoryHandleLike | undefined>(
      'readonly',
      (store) => store.get(HANDLE_KEY) as IDBRequest<DirectoryHandleLike | undefined>,
    );
    return handle ?? null;
  } catch (error) {
    console.warn('Unable to restore the folder selection', error);
    return null;
  }
};

export const clearDirectoryHandle = async (): Promise<void> => {
  try {
    await withStore('readwrite', (store) => store.delete(HANDLE_KEY) as IDBRequest<undefined>);
  } catch (error) {
    console.warn('Unable to clear the folder selection', error);
  }
};
