import { ChevronRight, Trash2, Pencil, FileText, Plus, PenTool } from 'lucide-react';
import type { Edit } from '@/types';

interface Props {
  edits: Edit[];
  currentPage: number;
  onJump: (pageIndex: number) => void;
  onEdit: (editId: string) => void;
  onDelete: (editId: string) => void;
}

function kindBadge(kind: Edit['kind']) {
  switch (kind) {
    case 'edit': return { label: 'Edited Text', color: 'bg-indigo-50 text-indigo-700', Icon: Pencil };
    case 'add-text': return { label: 'Added Text', color: 'bg-emerald-50 text-emerald-700', Icon: Plus };
    case 'signature': return { label: 'Signature', color: 'bg-amber-50 text-amber-700', Icon: PenTool };
  }
}

function editPreview(e: Edit): { top: string; bottom: string } {
  if (e.kind === 'edit') {
    return { top: e.originalText, bottom: e.newText };
  }
  if (e.kind === 'add-text') {
    return { top: '', bottom: e.text };
  }
  return { top: '', bottom: 'Signature image' };
}

export default function EditsSidebar({ edits, currentPage, onJump, onEdit, onDelete }: Props) {
  const groups = new Map<number, Edit[]>();
  for (const e of edits) {
    const arr = groups.get(e.pageIndex) ?? [];
    arr.push(e);
    groups.set(e.pageIndex, arr);
  }
  const sortedPages = [...groups.keys()].sort((a, b) => a - b);

  return (
    <aside className="w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">Edits List</h2>
        <p className="text-xs text-slate-500 mt-0.5">{edits.length} change{edits.length === 1 ? '' : 's'}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {edits.length === 0 && (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <FileText size={22} />
            </div>
            <p className="text-sm text-slate-500">No edits yet</p>
            <p className="text-xs text-slate-400 mt-1">Click text to edit, use Add Text, or add a signature.</p>
          </div>
        )}

        {sortedPages.map((pg) => (
          <div key={pg} className="border-b border-slate-100">
            <div className="px-4 py-2 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Page {pg + 1}</span>
              {pg === currentPage && (
                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">current</span>
              )}
            </div>
            {groups.get(pg)!.map((e) => {
              const badge = kindBadge(e.kind);
              const preview = editPreview(e);
              const Icon = badge.Icon;
              return (
                <div key={e.id} className="px-3 py-2 hover:bg-slate-50 group">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onJump(pg)}
                      className="flex-1 text-left min-w-0"
                      title="Jump to this edit"
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.color}`}>
                          <Icon size={10} /> {badge.label}
                        </span>
                      </div>
                      {preview.top && <p className="text-xs text-slate-400 truncate line-through">{preview.top}</p>}
                      <p className="text-sm text-slate-800 truncate font-medium">{preview.bottom}</p>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(e.id)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Edit / select"
                      ><Pencil size={13} /></button>
                      <button
                        onClick={() => onDelete(e.id)}
                        className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      ><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <button
                    onClick={() => onJump(pg)}
                    className="mt-1 text-[11px] text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5"
                  >
                    Go to edit <ChevronRight size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
