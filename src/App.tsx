import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pdfjsLib } from '@/lib/pdfjs';
import { extractTextItems, getPdfCoords, pdfToCssX, pdfToCssYTop } from '@/lib/pdfCoords';
import { buildEditedPdf } from '@/lib/pdfExport';
import type { AddTextEdit, Edit, SignatureEdit, TextEdit, TextItemInfo } from '@/types';
import UploadScreen from '@/components/UploadScreen';
import Toolbar, { type EditorMode } from '@/components/Toolbar';
import TextEditor from '@/components/TextEditor';
import EditsSidebar from '@/components/EditsSidebar';
import SignatureModal from '@/components/SignatureModal';
import AddTextOverlay from '@/components/AddTextOverlay';
import SignatureOverlay from '@/components/SignatureOverlay';

interface PdfDoc {
  fileName: string;
  pageCount: number;
  originalBytes: Uint8Array;
  pdfDoc: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
}

interface OverlayBox {
  item: TextItemInfo;
  left: number;
  top: number;
  width: number;
  height: number;
}

let editIdCounter = 0;
function newEditId() {
  editIdCounter += 1;
  return `edit-${Date.now()}-${editIdCounter}`;
}

export default function App() {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [fitWidth, setFitWidth] = useState(false);

  const [edits, setEdits] = useState<Edit[]>([]);
  const [undoStack, setUndoStack] = useState<Edit[][]>([]);
  const [redoStack, setRedoStack] = useState<Edit[][]>([]);

  // Text-edit draft (for the inline TextEditor on existing text items)
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TextEdit | null>(null);

  // Selection for placeable items (add-text / signature)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [mode, setMode] = useState<EditorMode>('edit');
  const [showSignature, setShowSignature] = useState(false);
 const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [downloading, setDownloading] = useState(false);
  const [pageInfo, setPageInfo] = useState<{ width: number; height: number } | null>(null);
  const [overlayBoxes, setOverlayBoxes] = useState<OverlayBox[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---------- Load PDF ----------
  const loadFile = useCallback(async (file: File) => {
    setLoading(true);
    setLoadError(null);
    try {
      const buf = await file.arrayBuffer();
      const forPdfjs = new Uint8Array(buf.slice(0));
      const forExport = new Uint8Array(buf.slice(0));

      const task = pdfjsLib.getDocument({ data: forPdfjs });
      const pdfDoc = await task.promise;

      setDoc({ fileName: file.name, pageCount: pdfDoc.numPages, originalBytes: forExport, pdfDoc });
      setPageIndex(0);
      setEdits([]); setUndoStack([]); setRedoStack([]);
      setActiveEditId(null); setDraft(null); setSelectedId(null);
      setMode('edit');
      setFitWidth(true);
    } catch (err) {
      console.error(err);
      setLoadError('Could not open this PDF. Please make sure it is a valid digital PDF file.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGoHome = () => {
    setDoc(null);
    setPageIndex(0);
    setEdits([]);
    setUndoStack([]);
    setRedoStack([]);
    setActiveEditId(null);
    setDraft(null);
    setSelectedId(null);
    setOverlayBoxes([]);
    setPageInfo(null);
    setShowSignature(false);
    setLoadError(null);
    setMode('edit');
    setLoading(false)
  };

  // ---------- Render page ----------
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;

    async function render() {
      if (!doc || !canvasRef.current) return;
      const page = await doc.pdfDoc.getPage(pageIndex + 1);
      if (cancelled) return;

      let useScale = scale;
      if (fitWidth && scrollRef.current) {
       const avail = scrollRef.current.clientWidth - (window.innerWidth < 640 ? 16 : 48);
        const viewport0 = page.getViewport({ scale: 1 });
        useScale = Math.max(0.3, Math.min(4, avail / viewport0.width));
        setScale(useScale);
      }

      const viewport = page.getViewport({ scale: useScale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const renderTask = page.render({ canvasContext: ctx, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined } as never);
      renderTaskRef.current = renderTask;
      try { await renderTask.promise; } catch { /* cancelled */ }
      if (cancelled) return;

      setPageInfo({ width: viewport.width / useScale, height: viewport.height / useScale });

      const textContent = await page.getTextContent();
      if (cancelled) return;
      const items = extractTextItems(textContent);
      const pageHeight = viewport.height / useScale;

      const boxes: OverlayBox[] = items.map((item) => {
        const { x, y } = getPdfCoords(item);
        const left = pdfToCssX(x, useScale);
        const top = pdfToCssYTop(y, item.fontSize, pageHeight, useScale);
        const width = Math.max(item.width * useScale, 8);
        const height = item.fontSize * useScale;
        return { item, left, top, width, height };
      });
      setOverlayBoxes(boxes);
    }

    render();
    return () => {
      cancelled = true;
      try { renderTaskRef.current?.cancel(); } catch { /* noop */ }
    };
  }, [doc, pageIndex, scale, fitWidth,sidebarOpen]);

  // ---------- History helpers ----------
  const pushHistory = useCallback((next: Edit[]) => {
    setUndoStack((u) => [...u.slice(-49), edits]);
    setRedoStack([]);
    setEdits(next);
  }, [edits]);

  function undo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, edits]);
    setEdits(prev);
    setActiveEditId(null); setDraft(null); setSelectedId(null);
  }

  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, edits]);
    setEdits(next);
    setActiveEditId(null); setDraft(null); setSelectedId(null);
  }

  function resetAll() {
    if (edits.length === 0) return;
    pushHistory([]);
    setActiveEditId(null); setDraft(null); setSelectedId(null);
  }

  function deleteEdit(id: string) {
    pushHistory(edits.filter((e) => e.id !== id));
    if (activeEditId === id) { setActiveEditId(null); setDraft(null); }
    if (selectedId === id) setSelectedId(null);
  }

  // ---------- Existing-text editing ----------
  const findEditForItem = useCallback((box: OverlayBox): TextEdit | undefined => {
    return edits.find((e): e is TextEdit =>
      e.kind === 'edit' && e.pageIndex === pageIndex &&
      Math.abs(e.x - box.item.transform[4]) < 0.5 &&
      Math.abs(e.y - box.item.transform[5]) < 0.5
    );
  }, [edits, pageIndex]);

  function startEdit(box: OverlayBox) {
    const existing = findEditForItem(box);
    if (existing) {
      setActiveEditId(existing.id);
      setDraft({ ...existing });
    } else {
      const newE: TextEdit = {
        id: newEditId(), kind: 'edit', pageIndex,
        originalText: box.item.str,
        newText: box.item.str,
        x: box.item.transform[4], y: box.item.transform[5],
        width: box.item.width || (box.item.str.length * box.item.fontSize * 0.5),
        height: box.item.fontSize,
        fontSize: box.item.fontSize,
        fontFamily: 'Helvetica', bold: false, underline: false,
        textColor: '#000000', bgColor: '#FFFFFF',
      };
      setActiveEditId(newE.id);
      setDraft(newE);
    }
    setSelectedId(null);
  }

  function applyDraft() {
    if (!draft || !activeEditId) return;
    const exists = edits.some((e) => e.id === activeEditId);
    const next = exists ? edits.map((e) => (e.id === activeEditId ? draft : e)) : [...edits, draft];
    pushHistory(next);
    setActiveEditId(null); setDraft(null);
  }

  function cancelDraft() {
    setActiveEditId(null); setDraft(null);
  }

  // ---------- Add Text mode ----------
  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== 'add-text' || !pageInfo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    // Convert to unscaled PDF coords. y from bottom.
    const xPdf = cssX / scale;
    const yPdf = pageInfo.height - cssY / scale; // bottom of click
    // baseline ~ a bit above the click point so text appears at cursor
    const baseline = yPdf - 4;

    const newE: AddTextEdit = {
      id: newEditId(), kind: 'add-text', pageIndex,
      text: 'New text',
      x: xPdf, y: baseline,
      fontSize: 14,
      fontFamily: 'Helvetica', bold: false, underline: false,
      textColor: '#000000', bgColor: 'transparent',
    };
    pushHistory([...edits, newE]);
    setSelectedId(newE.id);
    setMode('edit'); // switch back to edit so user can move/resize
  }

  // ---------- Signature insertion ----------
  async function insertSignature(dataUrl: string, format: 'png' | 'jpg') {
    if (!pageInfo) return;
    // Load image to determine aspect ratio
    const img = new Image();
    img.src = dataUrl;
    await new Promise((res) => { img.onload = res; img.onerror = res; });
    const naturalW = img.naturalWidth || 300;
    const naturalH = img.naturalHeight || 120;
    // Default placed width ~ 180pt; preserve aspect ratio
    const targetW = Math.min(200, pageInfo.width * 0.4);
    const targetH = targetW * (naturalH / naturalW);
    // Place near top-left area of page
    const x = pageInfo.width * 0.35;
    const y = pageInfo.height * 0.5;

    const newE: SignatureEdit = {
      id: newEditId(), kind: 'signature', pageIndex,
      x, y, width: targetW, height: targetH,
      dataUrl, format,
    };
    pushHistory([...edits, newE]);
    setSelectedId(newE.id);
    setShowSignature(false);
  }

  // ---------- Placeable item updates ----------
  function updateAddText(id: string, patch: Partial<AddTextEdit>) {
    setEdits((cur) => cur.map((e) => (e.id === id && e.kind === 'add-text' ? { ...e, ...patch } : e)));
  }
  function updateSignature(id: string, patch: Partial<SignatureEdit>) {
    setEdits((cur) => cur.map((e) => (e.id === id && e.kind === 'signature' ? { ...e, ...patch } : e)));
  }

  // Commit a placeable move/resize to history when a drag ends would be ideal,
  // but to keep undo meaningful we snapshot on pointer-down. Simpler approach:
  // push history at the START of an interaction so undo reverts to pre-drag.
  const dragSnapshotRef = useRef<Edit[] | null>(null);
  function beginPlaceableDrag() {
    dragSnapshotRef.current = edits;
  }
  function endPlaceableDrag() {
    if (dragSnapshotRef.current) {
      setUndoStack((u) => [...u.slice(-49), dragSnapshotRef.current!]);
      setRedoStack([]);
      dragSnapshotRef.current = null;
    }
  }

  // ---------- Download ----------
  async function download() {
    if (!doc || edits.length === 0) return;
    setDownloading(true);
    try {
      const bytes = await buildEditedPdf(doc.originalBytes, edits);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `edited-${doc.fileName}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setLoadError('Failed to build the edited PDF.');
    } finally {
      setDownloading(false);
    }
  }

  function jumpToPage(pg: number) {
    if (pg < 0 || pg >= (doc?.pageCount ?? 0)) return;
    cancelDraft();
    setSelectedId(null);
    setPageIndex(pg);
  }

  function editExisting(id: string) {
    const e = edits.find((x) => x.id === id);
    if (!e) return;
    if (e.pageIndex !== pageIndex) setPageIndex(e.pageIndex);
    if (e.kind === 'edit') {
      setActiveEditId(e.id);
      setDraft({ ...e });
      setSelectedId(null);
    } else {
      setSelectedId(e.id);
      setActiveEditId(null); setDraft(null);
    }
  }

  // ---------- Derived ----------
  const draftBox = useMemo(() => {
    if (!draft || !pageInfo) return null;
    const left = pdfToCssX(draft.x, scale);
    const top = pdfToCssYTop(draft.y, draft.fontSize, pageInfo.height, scale);
    const width = Math.max(draft.width * scale, 60);
    const height = draft.fontSize * scale;
    return { left, top, width, height };
  }, [draft, pageInfo, scale]);

  const editsOnCurrentPage = useMemo(() => edits.filter((e) => e.pageIndex === pageIndex), [edits, pageIndex]);

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {!doc ? (
        loading ? (
          <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">Opening PDF…</div>
        ) : (
          <UploadScreen onFile={loadFile} error={loadError} />
        )
      ) : (
        <>
          <Toolbar
          onGoHome={handleGoHome}
            fileName={doc.fileName}
            pageIndex={pageIndex}
            pageCount={doc.pageCount}
            scale={scale}
            mode={mode}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            editCount={edits.length}
            sidebarOpen={sidebarOpen}
            onUploadNew={() => fileInputRef.current?.click()}
            onPrev={() => jumpToPage(pageIndex - 1)}
            onNext={() => jumpToPage(pageIndex + 1)}
            onZoomIn={() => { setFitWidth(false); setScale((s) => Math.min(4, s + 0.2)); }}
            onZoomOut={() => { setFitWidth(false); setScale((s) => Math.max(0.3, s - 0.2)); }}
            onFitWidth={() => setFitWidth(true)}
            onUndo={undo}
            onRedo={redo}
            onReset={resetAll}
            onDownload={download}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onModeChange={(m) => { setMode(m); setSelectedId(null); cancelDraft(); }}
            onOpenSignature={() => setShowSignature(true)}
            downloading={downloading}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
              e.target.value = '';
            }}
          />

          <div className="flex-1 flex min-h-0">
            {/* Workspace */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-auto flex justify-center p-2 sm:p-6 bg-slate-200/60"
            >
              <div
                className="relative inline-block"
                style={{
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  cursor: mode === 'add-text' ? 'crosshair' : 'default',
                }}
                onClick={(e) => {
                  if (mode === 'add-text') {
                    handleCanvasClick(e);
                  } else if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'CANVAS') {
                    // click empty space -> deselect
                    setActiveEditId(null); setDraft(null); setSelectedId(null);
                  }
                }}
              >
                <canvas ref={canvasRef} className="block bg-white" />

                {/* Applied text-edit previews (whiteout + text) */}
                {pageInfo && editsOnCurrentPage.filter((e) => e.kind === 'edit').map((e) => {
                  const te = e as TextEdit;
                  const left = pdfToCssX(te.x, scale);
                  const top = pdfToCssYTop(te.y, te.fontSize, pageInfo.height, scale);
                  const width = Math.max(te.width * scale, 8);
                  // Tight whiteout: cover glyph box only (descenders), not below.
                  const height = te.fontSize * 1.15 * scale + scale;
                  const isActive = activeEditId === te.id;
                  return (
                    <div
                      key={te.id}
                      className={`absolute pointer-events-none ${isActive ? 'opacity-0' : ''}`}
                      style={{ left, top, width, height, backgroundColor: te.bgColor }}
                    >
                      <div
                        style={{
                          fontFamily: te.fontFamily === 'Times Roman' ? 'Times, serif'
                            : te.fontFamily === 'Courier' ? 'Courier, monospace' : 'Helvetica, Arial, sans-serif',
                          fontWeight: te.bold ? 700 : 400,
                          fontSize: te.fontSize * scale,
                          color: te.textColor,
                          lineHeight: 1,
                          whiteSpace: 'pre',
                          textDecoration: te.underline ? 'underline' : 'none',
                        }}
                      >
                        {te.newText}
                      </div>
                    </div>
                  );
                })}

                {/* Clickable text overlay boxes (only in edit mode, no draft active) */}
                {mode === 'edit' && !activeEditId && pageInfo && overlayBoxes.map((box, i) => {
                  const hasEdit = editsOnCurrentPage.some((e) =>
                    e.kind === 'edit' &&
                    Math.abs((e as TextEdit).x - box.item.transform[4]) < 0.5 &&
                    Math.abs((e as TextEdit).y - box.item.transform[5]) < 0.5
                  );
                  if (hasEdit) return null;
                  return (
                    <div
                      key={i}
                      className="absolute cursor-text transition-colors"
                      style={{
                        left: box.left, top: box.top, width: box.width, height: box.height,
                        backgroundColor: hoverId === `b${i}` ? 'rgba(79,70,229,0.08)' : 'transparent',
                        boxShadow: hoverId === `b${i}` ? 'inset 0 0 0 1.5px #4f46e5' : 'none',
                      }}
                      onMouseEnter={() => setHoverId(`b${i}`)}
                      onMouseLeave={() => setHoverId(null)}
                      onClick={(ev) => { ev.stopPropagation(); startEdit(box); }}
                    />
                  );
                })}

                {/* Add-text overlays */}
                {pageInfo && editsOnCurrentPage.filter((e) => e.kind === 'add-text').map((e) => (
                  <AddTextOverlay
                    key={e.id}
                    edit={e as AddTextEdit}
                    scale={scale}
                    pageHeight={pageInfo.height}
                    selected={selectedId === e.id}
                    onSelect={() => { setSelectedId(e.id); cancelDraft(); }}
                    onChange={(patch) => updateAddText(e.id, patch)}
                    onStartEdit={() => {
                      const newText = window.prompt('Edit text', (e as AddTextEdit).text);
                      if (newText !== null) updateAddText(e.id, { text: newText });
                    }}
                    onDelete={() => deleteEdit(e.id)}
                    onDragStart={beginPlaceableDrag}
                    onDragEnd={endPlaceableDrag}
                  />
                ))}

                {/* Signature overlays */}
                {pageInfo && editsOnCurrentPage.filter((e) => e.kind === 'signature').map((e) => (
                  <SignatureOverlay
                    key={e.id}
                    edit={e as SignatureEdit}
                    scale={scale}
                    pageHeight={pageInfo.height}
                    selected={selectedId === e.id}
                    onSelect={() => { setSelectedId(e.id); cancelDraft(); }}
                    onChange={(patch) => updateSignature(e.id, patch)}
                    onDelete={() => deleteEdit(e.id)}
                    onDragStart={beginPlaceableDrag}
                    onDragEnd={endPlaceableDrag}
                  />
                ))}

                {/* Inline text editor for existing text items */}
                {draft && draftBox && (
                  <TextEditor
                    edit={draft}
                    onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
                    onApply={applyDraft}
                    onCancel={cancelDraft}
                    onDelete={() => { if (activeEditId) deleteEdit(activeEditId); }}
                    cssLeft={draftBox.left}
                    cssTop={draftBox.top}
                    cssWidth={draftBox.width}
                    cssHeight={draftBox.height}
                    scale={scale}
                  />
                )}
              </div>
            </div>

            {sidebarOpen && (
              <EditsSidebar
                edits={edits}
                currentPage={pageIndex}
                onJump={jumpToPage}
                onEdit={editExisting}
                onDelete={deleteEdit}
              />
            )}
          </div>

          {showSignature && (
            <SignatureModal
              onClose={() => setShowSignature(false)}
              onInsert={insertSignature}
            />
          )}
        </>
      )}
    </div>
  );
}
