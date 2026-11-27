import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { SignatureEdit } from '@/types';

interface Props {
  edit: SignatureEdit;
  scale: number;
  pageHeight: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<SignatureEdit>) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

type DragMode = 'move' | 'resize' | null;

export default function SignatureOverlay(p: Props) {
  const { edit, scale, pageHeight, selected } = p;
  const [drag, setDrag] = useState<DragMode>(null);
  const startRef = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number; ratio: number } | null>(null);

  const left = edit.x * scale;
  const top = (pageHeight - edit.y - edit.height) * scale;
  const width = edit.width * scale;
  const height = edit.height * scale;

  function onPointerDown(e: React.PointerEvent, mode: DragMode) {
    e.stopPropagation();
    e.preventDefault();
    p.onSelect();
    setDrag(mode);
    if (mode) p.onDragStart();
    startRef.current = {
      px: e.clientX, py: e.clientY,
      x: edit.x, y: edit.y, w: edit.width, h: edit.height,
      ratio: edit.width / edit.height,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag || !startRef.current) return;
    const dx = (e.clientX - startRef.current.px) / scale;
    const dy = (e.clientY - startRef.current.py) / scale;
    if (drag === 'move') {
      p.onChange({ x: startRef.current.x + dx, y: startRef.current.y - dy });
    } else if (drag === 'resize') {
      // preserve aspect ratio; use dominant delta
      const delta = Math.max(dx, -dy);
      const newW = Math.max(20, startRef.current.w + delta);
      const newH = newW / startRef.current.ratio;
      p.onChange({ width: newW, height: newH });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (drag) p.onDragEnd();
    setDrag(null);
    startRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  return (
    <div
      className="absolute select-none"
      style={{ left, top, width, height }}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <img
        src={edit.dataUrl}
        alt="signature"
        draggable={false}
        className="w-full h-full object-contain pointer-events-none"
      />
      {selected && (
        <>
          <div className="absolute -inset-px border-2 border-indigo-500 rounded-sm pointer-events-none" />
          {/* resize handle bottom-right */}
          <div
            className="absolute -right-1.5 -bottom-1.5 w-3.3 h-3.3 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-nwse-resize"
            onPointerDown={(e) => onPointerDown(e, 'resize')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          {/* mini toolbar */}
          <div
            className="absolute z-40 -top-10 left-0 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex items-center gap-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-slate-500 px-1">Signature</span>
            <div className="w-px h-4 bg-slate-200" />
            <button onClick={p.onDelete} className="p-1 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
