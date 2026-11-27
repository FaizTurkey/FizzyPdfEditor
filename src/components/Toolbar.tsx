import {
  FileText, Upload, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize, Undo2, Redo2, RotateCcw, Download, PanelRightClose, PanelRightOpen,
  PenLine, Plus, MousePointerClick, Signature as SignatureIcon,
} from 'lucide-react';

export type EditorMode = 'edit' | 'add-text' | 'signature';

interface Props {
  fileName: string;
  pageIndex: number;
  pageCount: number;
  scale: number;
  mode: EditorMode;
  canUndo: boolean;
  canRedo: boolean;
  editCount: number;
  sidebarOpen: boolean;
  onUploadNew: () => void;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onDownload: () => void;
  onToggleSidebar: () => void;
  onModeChange: (m: EditorMode) => void;
  onOpenSignature: () => void;
  downloading: boolean;
}

function ToolButton({
  onClick, children, title, disabled, primary,
}: {
  onClick: () => void; children: React.ReactNode; title: string;
  disabled?: boolean; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        primary
          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function ModeButton({
  active, onClick, children, title,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function Toolbar(p: Props) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 shadow-sm flex-wrap">
      <div className="flex items-center gap-2 mr-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
          <FileText size={18} />
        </div>
        <span className="font-semibold text-slate-800 hidden sm:inline">PDF Text Studio</span>
      </div>

      <div className="h-6 w-px bg-slate-200 hidden sm:block" />

      <ToolButton onClick={p.onUploadNew} title="Upload new PDF">
        <Upload size={16} /> <span className="hidden md:inline">Upload</span>
      </ToolButton>

      <div className="h-6 w-px bg-slate-200" />

      {/* Mode switcher */}
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
        <ModeButton active={p.mode === 'edit'} onClick={() => p.onModeChange('edit')} title="Edit existing text">
          <MousePointerClick size={15} /> <span className="hidden md:inline">Edit Text</span>
        </ModeButton>
        <ModeButton active={p.mode === 'add-text'} onClick={() => p.onModeChange('add-text')} title="Add new text anywhere">
          <Plus size={15} /> <span className="hidden md:inline">Add Text</span>
        </ModeButton>
        <ModeButton active={false} onClick={p.onOpenSignature} title="Add digital signature">
          <SignatureIcon size={15} /> <span className="hidden md:inline">Signature</span>
        </ModeButton>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      <div className="flex items-center gap-1">
        <ToolButton onClick={p.onPrev} disabled={p.pageIndex <= 0} title="Previous page">
          <ChevronLeft size={16} />
        </ToolButton>
        <span className="text-sm text-slate-600 tabular-nums px-1 min-w-[80px] text-center">
          Page {p.pageIndex + 1} / {p.pageCount}
        </span>
        <ToolButton onClick={p.onNext} disabled={p.pageIndex >= p.pageCount - 1} title="Next page">
          <ChevronRight size={16} />
        </ToolButton>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      <div className="flex items-center gap-1">
        <ToolButton onClick={p.onZoomOut} title="Zoom out"><ZoomOut size={16} /></ToolButton>
        <span className="text-sm text-slate-600 tabular-nums w-14 text-center">{Math.round(p.scale * 100)}%</span>
        <ToolButton onClick={p.onZoomIn} title="Zoom in"><ZoomIn size={16} /></ToolButton>
        <ToolButton onClick={p.onFitWidth} title="Fit to width"><Maximize size={16} /></ToolButton>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      <div className="flex items-center gap-1">
        <ToolButton onClick={p.onUndo} disabled={!p.canUndo} title="Undo">
          <Undo2 size={16} /> <span className="hidden lg:inline">Undo</span>
        </ToolButton>
        <ToolButton onClick={p.onRedo} disabled={!p.canRedo} title="Redo">
          <Redo2 size={16} /> <span className="hidden lg:inline">Redo</span>
        </ToolButton>
        <ToolButton onClick={p.onReset} disabled={p.editCount === 0} title="Reset all edits">
          <RotateCcw size={16} /> <span className="hidden lg:inline">Reset</span>
        </ToolButton>
      </div>

      <div className="flex-1" />

      <ToolButton onClick={p.onDownload} disabled={p.editCount === 0 || p.downloading} primary title="Download edited PDF">
        <Download size={16} /> <span>{p.downloading ? 'Building…' : 'Download PDF'}</span>
      </ToolButton>

      <ToolButton onClick={p.onToggleSidebar} title="Toggle edits panel">
        {p.sidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
      </ToolButton>
    </header>
  );
}
