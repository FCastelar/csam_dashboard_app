/**
 * Minimal structural types for the File System Access API.
 *
 * They are declared locally instead of relying on `lib.dom` because the
 * directory iteration and permission members are not part of every TypeScript
 * DOM library version.
 */

export interface FileSystemPermissionOptions {
  mode?: 'read' | 'readwrite';
}

export interface FileHandleLike {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

export interface DirectoryHandleLike {
  kind: 'directory';
  name: string;
  values(): AsyncIterableIterator<FileHandleLike | DirectoryHandleLike>;
  queryPermission?(options?: FileSystemPermissionOptions): Promise<PermissionState>;
  requestPermission?(options?: FileSystemPermissionOptions): Promise<PermissionState>;
}

export type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: string;
  }) => Promise<DirectoryHandleLike>;
};

/** A single workbook exposed by a source, independent of where it came from. */
export interface AccountFile {
  /** File name including extension, e.g. `CAF_Account_Executive_View.xlsx`. */
  name: string;
  lastModified: number;
  read(): Promise<ArrayBuffer>;
}

export type SourceKind = 'folder' | 'upload';

export interface DashboardSource {
  kind: SourceKind;
  /** Human readable origin, shown in the header. */
  label: string;
  list(): Promise<AccountFile[]>;
}

const WORKBOOK_PATTERN = /\.xlsx$/i;

/** Excel writes `~$name.xlsx` lock files while a workbook is open. */
const isLockFile = (name: string) => name.startsWith('~$');

export const isWorkbookName = (name: string) => WORKBOOK_PATTERN.test(name) && !isLockFile(name);
