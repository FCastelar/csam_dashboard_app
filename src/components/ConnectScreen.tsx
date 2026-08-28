import { useRef, useState } from 'react';
import { AlertTriangle, FileSpreadsheet, FolderOpen, Loader2, ShieldCheck, Upload } from 'lucide-react';
import type { SourceStatus } from '../hooks/use-dashboard-source';

type ConnectScreenProps = {
  status: SourceStatus;
  error: string | null;
  supportsFolder: boolean;
  supportsFilePicker: boolean;
  onConnectFolder: () => void;
  onReconnectFolder: () => void;
  onConnectFiles: () => void;
  onSelectFiles: (files: File[]) => void;
  onDropFiles: (transfer: DataTransfer) => void;
};

const cardClasses = 'w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm';

function ConnectScreen({
  status,
  error,
  supportsFolder,
  supportsFilePicker,
  onConnectFolder,
  onReconnectFolder,
  onConnectFiles,
  onSelectFiles,
  onDropFiles,
}: ConnectScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = status === 'initializing' || status === 'loading';

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length) onDropFiles(event.dataTransfer);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className={cardClasses}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
          Executive Account Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-bold text-brand-night">Connect your files</h1>
        <p className="mt-3 text-sm text-slate-600">
          Select the OneDrive folder that holds the{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">*_Account_Executive_View.xlsx</code> files.
          The dashboard reads and processes everything in your browser.
        </p>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <p>
            Your data <strong>is never sent to any server</strong>. Reading happens locally and
            nothing is published or shared.
          </p>
        </div>

        {isBusy && (
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            {status === 'initializing' ? 'Checking previous access...' : 'Reading the files...'}
          </div>
        )}

        {!isBusy && (
          <div className="mt-6 space-y-4">
            {supportsFolder && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={status === 'reconnectable' ? onReconnectFolder : onConnectFolder}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  <FolderOpen size={16} />
                  {status === 'reconnectable' ? 'Reconnect' : 'Choose folder'}
                </button>
                {status === 'reconnectable' && (
                  <button
                    type="button"
                    onClick={onConnectFolder}
                    className="text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-800"
                  >
                    Choose another folder
                  </button>
                )}
              </div>
            )}

            {status === 'reconnectable' && (
              <p className="text-xs text-slate-500">
                The browser needs a click from you to reopen the files used previously.
              </p>
            )}

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={
                'rounded-xl border-2 border-dashed p-6 text-center transition ' +
                (isDragging ? 'border-brand-blue bg-blue-50' : 'border-slate-300 bg-slate-50')
              }
            >
              <FileSpreadsheet size={22} className="mx-auto text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">
                {supportsFolder
                  ? 'Or drag the .xlsx files here'
                  : 'Drag the .xlsx files here'}
              </p>
              <button
                type="button"
                onClick={() => (supportsFilePicker ? onConnectFiles() : fileInputRef.current?.click())}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Upload size={14} />
                Select files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length) onSelectFiles(files);
                  event.target.value = '';
                }}
              />
            </div>

            {!supportsFolder && (
              <p className="text-xs text-slate-500">
                To connect a folder and refresh automatically, use Microsoft Edge or Google Chrome on
                the desktop.
              </p>
            )}

            {!supportsFilePicker && (
              <p className="text-xs text-slate-500">
                This browser reads the file as a copy: to see changes saved in Excel, select the file
                again.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectScreen;
