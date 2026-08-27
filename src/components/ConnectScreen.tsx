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
        <h1 className="mt-2 text-2xl font-bold text-brand-night">Conecte seus arquivos</h1>
        <p className="mt-3 text-sm text-slate-600">
          Selecione a pasta do OneDrive onde ficam os arquivos{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">*_Account_Executive_View.xlsx</code>.
          O dashboard lê e processa tudo no seu navegador.
        </p>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <p>
            Seus dados <strong>não são enviados para nenhum servidor</strong>. A leitura acontece
            localmente e nada é publicado ou compartilhado.
          </p>
        </div>

        {isBusy && (
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            {status === 'initializing' ? 'Verificando acesso anterior...' : 'Lendo os arquivos...'}
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
                  {status === 'reconnectable' ? 'Reconectar' : 'Escolher pasta'}
                </button>
                {status === 'reconnectable' && (
                  <button
                    type="button"
                    onClick={onConnectFolder}
                    className="text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-800"
                  >
                    Escolher outra pasta
                  </button>
                )}
              </div>
            )}

            {status === 'reconnectable' && (
              <p className="text-xs text-slate-500">
                O navegador precisa de um clique seu para reabrir os arquivos usados anteriormente.
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
                  ? 'Ou arraste os arquivos .xlsx para cá'
                  : 'Arraste os arquivos .xlsx para cá'}
              </p>
              <button
                type="button"
                onClick={() => (supportsFilePicker ? onConnectFiles() : fileInputRef.current?.click())}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Upload size={14} />
                Selecionar arquivos
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
                Para conectar uma pasta e atualizar automaticamente, use o Microsoft Edge ou o Google
                Chrome no computador.
              </p>
            )}

            {!supportsFilePicker && (
              <p className="text-xs text-slate-500">
                Neste navegador o arquivo é lido como uma cópia: para ver alterações salvas no Excel,
                selecione o arquivo novamente.
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
