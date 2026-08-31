import { useRef, useState } from 'react';
import { AlertTriangle, FileSpreadsheet, FolderOpen, Loader2, ShieldCheck, Upload } from 'lucide-react';
import type { SourceStatus } from '../hooks/use-dashboard-source';
import { Button, Card, Notice } from './ui';

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
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 font-geist">
      <Card className="w-full max-w-2xl p-8">
        <p className="text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">
          Executive Account Dashboard
        </p>
        <h1 className="mt-3 text-heading-sm font-semibold text-ink md:text-heading">Connect your files</h1>
        <p className="mt-3 max-w-xl text-body text-mid-gray">
          Select the OneDrive folder that holds the{' '}
          <code className="rounded-small bg-canvas px-1.5 py-0.5 text-caption tracking-normal text-ink">
            *_Account_Executive_View.xlsx
          </code>{' '}
          files. The dashboard reads and processes everything in your browser.
        </p>

        <Notice className="mt-6" icon={<ShieldCheck size={18} strokeWidth={1.5} />}>
          Your data <strong className="font-medium">is never sent to any server</strong>. Reading happens
          locally and nothing is published or shared.
        </Notice>

        {isBusy && (
          <div className="mt-6 flex items-center gap-2 text-body font-medium text-mid-gray">
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
            {status === 'initializing' ? 'Checking previous access...' : 'Reading the files...'}
          </div>
        )}

        {!isBusy && (
          <div className="mt-6 space-y-4">
            {supportsFolder && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  onClick={status === 'reconnectable' ? onReconnectFolder : onConnectFolder}
                >
                  <FolderOpen size={16} strokeWidth={1.5} />
                  {status === 'reconnectable' ? 'Reconnect' : 'Choose folder'}
                </Button>
                {status === 'reconnectable' && (
                  <Button variant="ghost" onClick={onConnectFolder}>
                    Choose another folder
                  </Button>
                )}
              </div>
            )}

            {status === 'reconnectable' && (
              <p className="text-caption tracking-normal text-mid-gray">
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
                'rounded-card border border-dashed p-6 text-center transition-colors ' +
                (isDragging ? 'border-ink bg-canvas' : 'border-hairline bg-surface-alt')
              }
            >
              <FileSpreadsheet size={22} strokeWidth={1.5} className="mx-auto text-mid-gray" />
              <p className="mt-2 text-body text-mid-gray">
                {supportsFolder ? 'Or drag the .xlsx files here' : 'Drag the .xlsx files here'}
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => (supportsFilePicker ? onConnectFiles() : fileInputRef.current?.click())}
              >
                <Upload size={14} strokeWidth={1.5} />
                Select files
              </Button>
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
              <p className="text-caption tracking-normal text-mid-gray">
                To connect a folder and refresh automatically, use Microsoft Edge or Google Chrome on the
                desktop.
              </p>
            )}

            {!supportsFilePicker && (
              <p className="text-caption tracking-normal text-mid-gray">
                This browser reads the file as a copy: to see changes saved in Excel, select the file again.
              </p>
            )}
          </div>
        )}

        {error && (
          <Notice className="mt-5" variant="error" icon={<AlertTriangle size={18} strokeWidth={1.5} />}>
            {error}
          </Notice>
        )}
      </Card>
    </div>
  );
}

export default ConnectScreen;
