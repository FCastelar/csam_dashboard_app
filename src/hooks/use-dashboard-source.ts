import { useCallback, useEffect, useRef, useState } from 'react';
import { parseWorkbook } from '../services/parse-workbook';
import {
  forgetFolderSource,
  hasStoredFolder,
  pickFolderSource,
  restoreFolderSource,
  supportsFolderSource,
} from '../services/sources/folder-source';
import {
  adoptFileHandles,
  forgetFileSource,
  handlesFromDrop,
  hasStoredFiles,
  pickFileSource,
  restoreFileSource,
  supportsFileSource,
} from '../services/sources/file-source';
import { createUploadSource } from '../services/sources/upload-source';
import type { AccountFile, DashboardSource, SourceKind } from '../services/sources/types';
import type { DashboardSummary } from '../types/dashboard';

export type SourceStatus =
  | 'initializing'
  | 'disconnected'
  | 'reconnectable'
  | 'loading'
  | 'ready'
  | 'error';

const POLL_INTERVAL_MS = 10_000;

const pickDefaultAccount = (files: string[], current: string) => {
  if (current && files.includes(current)) return current;
  return files.find((file) => /^CAF_/i.test(file)) ?? files[0] ?? '';
};

const describeError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return '';
    if (error.message === 'PERMISSION_DENIED') return 'Permissão de leitura negada para a pasta.';
    if (error.message === 'UNSUPPORTED') return 'Este navegador não permite selecionar uma pasta.';
    if (error.message === 'NO_WORKBOOKS') return 'Nenhum arquivo .xlsx encontrado na seleção.';
    if (error.message === 'No relevant workbook sheets found.') {
      return 'O arquivo não tem as abas esperadas do Account Executive View.';
    }
    return error.message;
  }
  return 'Não foi possível carregar os dados.';
};

/**
 * Owns the workbook source (OneDrive folder or manual upload) and turns the
 * selected account into a parsed `DashboardSummary`.
 *
 * Everything happens in the browser: no workbook or derived data is uploaded.
 */
export const useDashboardSource = () => {
  const [status, setStatus] = useState<SourceStatus>('initializing');
  const [sourceKind, setSourceKind] = useState<SourceKind | null>(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const [accountFiles, setAccountFiles] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  const sourceRef = useRef<DashboardSource | null>(null);
  const filesRef = useRef<AccountFile[]>([]);
  const selectedRef = useRef('');
  const cacheRef = useRef(new Map<string, { lastModified: number; summary: DashboardSummary }>());

  useEffect(() => {
    selectedRef.current = selectedAccount;
  }, [selectedAccount]);

  const parseAccount = useCallback(async (file: AccountFile, force: boolean) => {
    const cached = cacheRef.current.get(file.name);
    if (!force && cached && cached.lastModified === file.lastModified) {
      return cached.summary;
    }

    const summary = parseWorkbook(await file.read());
    cacheRef.current.set(file.name, { lastModified: file.lastModified, summary });
    return summary;
  }, []);

  /** Re-reads the source and refreshes the account list plus the selected account. */
  const sync = useCallback(
    async (options: { force?: boolean; silent?: boolean } = {}) => {
      const source = sourceRef.current;
      if (!source) return;

      const { force = false, silent = false } = options;
      if (!silent) setStatus('loading');

      try {
        const files = await source.list();
        filesRef.current = files;

        const names = files.map((file) => file.name);
        setAccountFiles(names);

        const nextAccount = pickDefaultAccount(names, selectedRef.current);
        if (!nextAccount) {
          throw new Error('NO_WORKBOOKS');
        }

        if (nextAccount !== selectedRef.current) {
          selectedRef.current = nextAccount;
          setSelectedAccount(nextAccount);
        }

        const target = files.find((file) => file.name === nextAccount);
        if (!target) throw new Error('NO_WORKBOOKS');

        const cached = cacheRef.current.get(target.name);
        const unchanged = cached && cached.lastModified === target.lastModified;
        if (silent && unchanged && !force) return;

        setData(await parseAccount(target, force));
        setLastLoadedAt(Date.now());
        setError(null);
        setStatus('ready');
      } catch (caught) {
        console.error('Unable to load dashboard data', caught);
        if (silent) return;
        setError(describeError(caught));
        setStatus('error');
      }
    },
    [parseAccount],
  );

  const activate = useCallback(
    async (source: DashboardSource) => {
      sourceRef.current = source;
      cacheRef.current.clear();
      setSourceKind(source.kind);
      setSourceLabel(source.label);
      await sync({ force: true });
    },
    [sync],
  );

  // Silently restores a previously granted folder or workbook selection.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!supportsFolderSource() && !supportsFileSource()) {
        setStatus('disconnected');
        return;
      }

      try {
        const restored = (await restoreFolderSource(false)) ?? (await restoreFileSource(false));
        if (cancelled) return;

        if (restored) {
          await activate(restored);
          return;
        }

        const stored = (await hasStoredFolder()) || (await hasStoredFiles());
        if (!cancelled) setStatus(stored ? 'reconnectable' : 'disconnected');
      } catch (caught) {
        console.warn('Unable to restore the previous selection', caught);
        if (!cancelled) setStatus('disconnected');
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [activate]);

  // Mirrors the previous "save the Excel and the dashboard updates" behaviour.
  useEffect(() => {
    if (status !== 'ready') return undefined;
    const timer = window.setInterval(() => void sync({ silent: true }), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [status, sync]);

  const selectAccount = useCallback(
    async (name: string) => {
      selectedRef.current = name;
      setSelectedAccount(name);

      const target = filesRef.current.find((file) => file.name === name);
      if (!target) return;

      try {
        setData(await parseAccount(target, false));
        setLastLoadedAt(Date.now());
        setError(null);
        setStatus('ready');
      } catch (caught) {
        console.error('Unable to switch account', caught);
        setError(describeError(caught));
        setStatus('error');
      }
    },
    [parseAccount],
  );

  const connectFolder = useCallback(async () => {
    setError(null);
    try {
      await activate(await pickFolderSource());
    } catch (caught) {
      const message = describeError(caught);
      if (!message) return; // The user dismissed the picker.
      console.error('Unable to connect the folder', caught);
      setError(message);
      setStatus('error');
    }
  }, [activate]);

  const reconnectFolder = useCallback(async () => {
    setError(null);
    try {
      const restored = (await restoreFolderSource(true)) ?? (await restoreFileSource(true));
      if (restored) {
        await activate(restored);
        return;
      }
      await connectFolder();
    } catch (caught) {
      console.error('Unable to reconnect the previous selection', caught);
      setError(describeError(caught));
      setStatus('error');
    }
  }, [activate, connectFolder]);

  const connectFiles = useCallback(async () => {
    setError(null);
    try {
      await activate(await pickFileSource());
    } catch (caught) {
      const message = describeError(caught);
      if (!message) return; // The user dismissed the picker.
      console.error('Unable to open the selected files', caught);
      setError(message);
      setStatus('error');
    }
  }, [activate]);

  const loadFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      try {
        await activate(createUploadSource(files));
      } catch (caught) {
        console.error('Unable to read the selected files', caught);
        setError(describeError(caught));
        setStatus('error');
      }
    },
    [activate],
  );

  /** Prefers persistable handles from a drop and falls back to in-memory files. */
  const dropFiles = useCallback(
    async (transfer: DataTransfer) => {
      setError(null);
      try {
        const handles = await handlesFromDrop(transfer.items);
        if (handles.length) {
          await activate(await adoptFileHandles(handles));
          return;
        }
        await activate(createUploadSource(Array.from(transfer.files)));
      } catch (caught) {
        console.error('Unable to read the dropped files', caught);
        setError(describeError(caught));
        setStatus('error');
      }
    },
    [activate],
  );

  const refresh = useCallback(async () => {
    if (!sourceRef.current) return;
    setIsRefreshing(true);
    try {
      await sync({ force: true });
    } finally {
      setIsRefreshing(false);
    }
  }, [sync]);

  const disconnect = useCallback(async () => {
    await forgetFolderSource();
    await forgetFileSource();
    sourceRef.current = null;
    filesRef.current = [];
    cacheRef.current.clear();
    selectedRef.current = '';
    setSourceKind(null);
    setSourceLabel('');
    setAccountFiles([]);
    setSelectedAccount('');
    setData(null);
    setError(null);
    setLastLoadedAt(null);
    setStatus('disconnected');
  }, []);

  return {
    status,
    sourceKind,
    sourceLabel,
    supportsFolder: supportsFolderSource(),
    supportsFilePicker: supportsFileSource(),
    accountFiles,
    selectedAccount,
    data,
    error,
    isRefreshing,
    lastLoadedAt,
    selectAccount,
    connectFolder,
    reconnectFolder,
    connectFiles,
    loadFiles,
    dropFiles,
    refresh,
    disconnect,
  };
};
