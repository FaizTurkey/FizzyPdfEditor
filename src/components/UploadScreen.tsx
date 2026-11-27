import { useRef, useState, type DragEvent } from 'react';
import { FileText, UploadCloud, ShieldCheck } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  error?: string | null;
}

export default function UploadScreen({ onFile, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') onFile(file);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">PDF Text Studio</h1>
            <p className="text-sm text-slate-500">Edit text in any digital PDF, right in your browser</p>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed bg-white p-12 text-center transition-all ${
            dragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
          }`}
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
            <UploadCloud size={30} />
          </div>
          <p className="text-lg font-semibold text-slate-800">Drag & drop your PDF here</p>
          <p className="text-sm text-slate-500 mt-1">or click to browse your files</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-start gap-3 rounded-lg bg-white/70 border border-slate-200 px-4 py-3">
          <ShieldCheck size={20} className="text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600 leading-relaxed">
            Works best with digital text-based PDFs (resumes, invoices, certificates). 100% private — all editing happens locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
