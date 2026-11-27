import { useRef, useState } from 'react';
import { Trash2, Pencil, Underline as UnderlineIcon } from 'lucide-react';
import type { AddTextEdit, FontFamily } from '@/types';

interface Props {
  edit: AddTextEdit;
  scale: number;
  pageHeight: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<AddTextEdit>) => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const FONTS: FontFamily[] = ['Helvetica', 'Times Roman', 'Courier'];

type DragMode = 'move' | 'resize' | null;

export default function AddTextOverlay(p: Props) {
  const { edit, scale, pageHeight, selected } = p;
  const [drag, setDrag] = useState<DragMode>(null);
  const startRef = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);

  const left = edit.x * scale;
  // y is baseline (bottom). We render a box where baseline ~ bottom of text.
  // Approx text box height = fontSize * 1.2
  const boxHeightPts = edit.fontSize * 1.25;
  const top = (pageHeight - edit.y - edit.fontSize) * scale;
  const width = Math.max(measureTextWidth(edit.text, edit.fontFamily, edit.bold, edit.fontSize) * scale, 40);
  const height = boxHeightPts * scale;

  function onPointerDown(e: React.PointerEvent, mode: DragMode) {
    e.stopPropagation();
    e.preventDefault();
    p.onSelect();
    setDrag(mode);
    if (mode) p.onDragStart();
    startRef.current = {
      px: e.clientX, py: e.clientY,
      x: edit.x, y: edit.y, w: width / scale, h: boxHeightPts,
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
      // resize font size proportionally to width change
      const newWPts = Math.max(20, startRef.current.w + dx);
      const ratio = newWPts / startRef.current.w;
      p.onChange({ fontSize: Math.max(6, Math.min(96, edit.fontSize * ratio)) });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (drag) p.onDragEnd();
    setDrag(null);
    startRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  const cssFontFamily = edit.fontFamily === 'Times Roman' ? 'Times, serif'
    : edit.fontFamily === 'Courier' ? 'Courier, monospace' : 'Helvetica, Arial, sans-serif';

  return (
    <div
      className="absolute select-none"
      style={{ left, top, width, height }}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* background */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: edit.bgColor === 'transparent' ? 'transparent' : edit.bgColor }}
      />
      {/* text */}
      <div
        className="absolute left-0 right-0 whitespace-pre overflow-hidden"
        style={{
          bottom: 0,
          fontFamily: cssFontFamily,
          fontWeight: edit.bold ? 700 : 400,
          fontSize: edit.fontSize * scale,
          color: edit.textColor,
          lineHeight: 1,
          textDecoration: edit.underline ? 'underline' : 'none',
        }}
      >
        {edit.text || ' '}
      </div>

      {selected && (
        <>
          <div className="absolute -inset-px border-2 border-indigo-500 rounded-sm pointer-events-none" />
          {/* resize handle bottom-right */}
          <div
            className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white border-2 border-indigo-500 rounded-sm cursor-nwse-resize"
            onPointerDown={(e) => onPointerDown(e, 'resize')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          {/* mini toolbar */}
          <div
            className="absolute z-40 -top-10 left-0 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex items-center gap-1 flex-wrap"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <select
              value={edit.fontFamily}
              onChange={(e) => p.onChange({ fontFamily: e.target.value as FontFamily })}
              className="text-xs rounded border border-slate-300 px-1 py-0.5 bg-white text-slate-700 outline-none"
            >
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <div className="flex items-center rounded border border-slate-300 overflow-hidden">
              <button onClick={() => p.onChange({ fontSize: Math.max(6, edit.fontSize - 1) })} className="px-1 text-xs text-slate-600 hover:bg-slate-100">-</button>
              <span className="text-[11px] px-1 tabular-nums min-w-[24px] text-center">{Math.round(edit.fontSize)}</span>
              <button onClick={() => p.onChange({ fontSize: Math.min(96, edit.fontSize + 1) })} className="px-1 text-xs text-slate-600 hover:bg-slate-100">+</button>
            </div>
            <button
              onClick={() => p.onChange({ bold: !edit.bold })}
              className={`px-1.5 py-0.5 rounded text-xs font-bold ${edit.bold ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >B</button>
            <button
              onClick={() => p.onChange({ underline: !edit.underline })}
              className={`px-1.5 py-0.5 rounded text-xs ${edit.underline ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Underline"
            ><UnderlineIcon size={13} /></button>
            <label className="flex items-center gap-0.5" title="Text color">
              <input type="color" value={edit.textColor} onChange={(e) => p.onChange({ textColor: e.target.value })} className="w-5 h-5 cursor-pointer border border-slate-300 rounded p-0" />
            </label>
            <label className="flex items-center gap-0.5" title="Background color">
              <input type="color" value={edit.bgColor === 'transparent' ? '#ffffff' : edit.bgColor}
                onChange={(e) => p.onChange({ bgColor: e.target.value })}
                className="w-5 h-5 cursor-pointer border border-slate-300 rounded p-0" />
              <button
                onClick={() => p.onChange({ bgColor: 'transparent' })}
                className="text-[9px] text-slate-500 hover:text-slate-700"
                title="Transparent background"
              >none</button>
            </label>
            <div className="w-px h-4 bg-slate-200" />
            <button onClick={p.onStartEdit} className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Edit text"><Pencil size={13} /></button>
            <button onClick={p.onDelete} className="p-1 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={13} /></button>
          </div>
        </>
      )}
    </div>
  );
}

// crude text width measurement for overlay sizing
const measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
function measureTextWidth(text: string, family: FontFamily, bold: boolean, size: number): number {
  if (!measureCanvas) return text.length * size * 0.55;
  const ctx = measureCanvas.getContext('2d')!;
  const css = family === 'Times Roman' ? 'Times, serif' : family === 'Courier' ? 'Courier, monospace' : 'Helvetica, Arial, sans-serif';
  ctx.font = `${bold ? 700 : 400} ${size}px ${css}`;
  return ctx.measureText(text).width;
}
