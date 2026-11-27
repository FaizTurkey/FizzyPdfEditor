import { useRef, useState, type DragEvent } from 'react';
import { FileText, UploadCloud, ShieldCheck } from 'lucide-react';
import photo from '../assets/profile.jpg'

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
    <div className="min-h-screen flex flex-col items-center justify-start py-6 sm:py-10 px-4 sm:px-6 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">FizzyPDF Editor</h1>
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

      {/* About Me Section */}
      <section className="w-full max-w-2xl mt-12 rounded-2xl bg-white/90 backdrop-blur border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Circular Photo */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-indigo-600 via-indigo-400 to-sky-400 shadow-md">
              <img
                src={photo}
                alt="Mohd Faiz Aalam"
                className="w-full h-full rounded-full object-cover bg-slate-100"
              />
            </div>
            <span className="mt-2 sm:mt-0 sm: -bottom-1 sm:right-1 sm:absolute inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              Creator
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
              About Me
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              The Person Behind “FizzyPDF Editor”
            </h2>
            {/* Creator badge ke neeche */}
            <div className="mt-2 flex flex-col items-center">
              <a
                href="https://www.linkedin.com/in/mohdfaiz12"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-sm transition-all"
              >
                <svg
                  className="w-3.5 h-3.5 fill-current shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17A1.4 1.4 0 0 1 15.71 13.57V18.5H18.5M6.88 8.56A1.68 1.68 0 0 0 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19A1.69 1.69 0 0 0 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z" />
                </svg>
                <span>Connect me on LinkedIn</span>
              </a>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Hi, I'm <span className="font-semibold text-slate-800">Mohd Faiz</span> — a
              full-stack web developer focused on building fast, privacy-first browser tools and
              modern web apps.
            </p>
          </div>
        </div>
      </section>
    </div>

    
  );

  
}
