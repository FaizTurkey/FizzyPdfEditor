import { useEffect, useRef, useState } from 'react';
import { Check, X, Trash2, Bold, Underline as UnderlineIcon, Plus, Minus } from 'lucide-react';
import type { TextEdit, FontFamily } from '@/types';

interface Props {
  edit: TextEdit;
  onChange: (patch: Partial<TextEdit>) => void;
  onApply: () => void;
  onCancel: () => void;
  onDelete: () => void;
  // css position of the text box (left, top) in px relative to canvas wrapper
  cssLeft: number;
  cssTop: number;
  cssWidth: number;
  cssHeight: number;
  scale: number;
}

const FONTS: FontFamily[] = ['Helvetica', 'Times Roman', 'Courier'];

export default function TextEditor(p: Props) {
  const { edit, scale } = p;
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
    taRef.current?.select();
  }, []);

  const fontPx = edit.fontSize * scale;

  return (
    <>
      {/* Whiteout + text preview overlay at exact location */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: p.cssLeft,
          top: p.cssTop,
          width: p.cssWidth,
          height: p.cssHeight,
          backgroundColor: edit.bgColor,
          boxShadow: '0 0 0 1.5px #4f46e5',
        }}
      >
        <div
          style={{
            fontFamily: edit.fontFamily === 'Times Roman' ? 'Times, serif'
              : edit.fontFamily === 'Courier' ? 'Courier, monospace' : 'Helvetica, Arial, sans-serif',
            fontWeight: edit.bold ? 700 : 400,
            fontSize: fontPx,
            color: edit.textColor,
            lineHeight: 1,
            whiteSpace: 'pre',
            transform: 'translateY(0)',
            textDecoration: edit.underline ? 'underline' : 'none',
          }}
        >
          {edit.newText}
        </div>
      </div>

      {/* Floating toolbar above the box */}
      <div
        className="absolute z-40 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex items-center gap-1 flex-nowrap overflow-x-auto max-w-[calc(100vw-24px)]"
        style={{
          left: window.innerWidth < 640 ? 4 : Math.max(8, p.cssLeft),
          top: p.cssTop < 65 ? p.cssTop + p.cssHeight + 10 : p.cssTop - 52,
        }}
      >
        <select
          value={edit.fontFamily}
          onChange={(e) => p.onChange({ fontFamily: e.target.value as FontFamily })}
          className="text-xs max-xs-[78px] sm:max-w-none truncate rounded border border-slate-300 px-1.5 py-1 bg-white text-slate-700 outline-none focus:border-indigo-400"
          title="Font family"
        >
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        <div className="flex items-center rounded border border-slate-300 overflow-hidden">
          <button
            onClick={() => p.onChange({ fontSize: Math.max(4, edit.fontSize - 1) })}
            className="px-1 py-1 text-slate-600 hover:bg-slate-100"
            title="Decrease font size"
          ><Minus size={13} /></button>
          <span className="text-xs px-1.5 tabular-nums text-slate-700 min-w-[28px] text-center">{Math.round(edit.fontSize)}</span>
          <button
            onClick={() => p.onChange({ fontSize: Math.min(96, edit.fontSize + 1) })}
            className="px-1 py-1 text-slate-600 hover:bg-slate-100"
            title="Increase font size"
          ><Plus size={13} /></button>
        </div>

        <button
          onClick={() => p.onChange({ bold: !edit.bold })}
          className={`px-1.5 py-1 rounded ${edit.bold ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          title="Bold"
        ><Bold size={14} /></button>

        <button
          onClick={() => p.onChange({ underline: !edit.underline })}
          className={`px-1.5 py-1 rounded ${edit.underline ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          title="Underline"
        ><UnderlineIcon size={14} /></button>

        <label className="flex items-center gap-1 px-1" title="Text color">
          <span className="text-[10px] text-slate-500">T</span>
          <input
            type="color"
            value={edit.textColor}
            onChange={(e) => p.onChange({ textColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border border-slate-300 p-0"
          />
        </label>

        <label className="flex items-center gap-1 px-1" title="Background / whiteout color">
          <span className="text-[10px] text-slate-500">BG</span>
          <input
            type="color"
            value={edit.bgColor}
            onChange={(e) => p.onChange({ bgColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border border-slate-300 p-0"
          />
        </label>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <button
          onClick={p.onApply}
          className="inline-flex items-center gap-1 rounded bg-indigo-600 text-white px-2 py-1 text-xs hover:bg-indigo-700"
          title="Apply edit"
        ><Check size={13} /> Apply</button>
        <button
          onClick={p.onCancel}
          className="inline-flex items-center rounded text-slate-600 px-1.5 py-1 text-xs hover:bg-slate-100"
          title="Cancel"
        ><X size={14} /></button>
        <button
          onClick={p.onDelete}
          className="inline-flex items-center rounded text-red-600 px-1.5 py-1 text-xs hover:bg-red-50"
          title="Revert / delete edit"
        ><Trash2 size={14} /></button>
      </div>

      {/* Inline textarea positioned over the box for editing */}
      <textarea
        ref={taRef}
        value={edit.newText}
        onChange={(e) => p.onChange({ newText: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); p.onApply(); }
          if (e.key === 'Escape') { e.preventDefault(); p.onCancel(); }
        }}
        className="absolute z-30 bg-transparent outline-none resize-none overflow-hidden"
        style={{
          left: p.cssLeft,
          top: p.cssTop,
          width: Math.max(p.cssWidth, 60),
          height: p.cssHeight,
          fontSize: fontPx,
          lineHeight: 1,
          fontFamily: edit.fontFamily === 'Times Roman' ? 'Times, serif'
            : edit.fontFamily === 'Courier' ? 'Courier, monospace' : 'Helvetica, Arial, sans-serif',
          fontWeight: edit.bold ? 700 : 400,
          color: edit.textColor,
          textDecoration: edit.underline ? 'underline' : 'none',
          backgroundColor: 'transparent',
          padding: 0,
          margin: 0,
          border: 'none',
          caretColor: edit.textColor,
        }}
      />
    </>
  );
}
