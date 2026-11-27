import { useEffect, useRef, useState } from 'react';
import { PenLine, Type, Upload, X, Trash2, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
  onInsert: (dataUrl: string, format: 'png' | 'jpg') => void;
}

type Tab = 'draw' | 'type' | 'upload';

const INK_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Blue', value: '#1D4ED8' },
];

// cursive-ish web fonts commonly available; we render to canvas as a proxy for
// handwriting style (exported as transparent PNG).
const TYPE_FONTS = [
  { name: 'Cursive', value: '"Brush Script MT", "Segoe Script", cursive' },
  { name: 'Italic Serif', value: '"Times New Roman", serif' },
  { name: 'Hand', value: '"Comic Sans MS", "Segoe Print", cursive' },
];

export default function SignatureModal({ onClose, onInsert }: Props) {
  const [tab, setTab] = useState<Tab>('draw');
  const [inkColor, setInkColor] = useState('#1D4ED8');
  const [typedName, setTypedName] = useState('');
  const [typedFont, setTypedFont] = useState(TYPE_FONTS[0].value);
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);
  const [uploadFormat, setUploadFormat] = useState<'png' | 'jpg'>('png');

  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const hasDrawnRef = useRef(false);

  // ---- Draw tab ----
  useEffect(() => {
    if (tab !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  }, [tab]);

  function getPos(e: PointerEvent | React.PointerEvent): { x: number; y: number } {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPtRef.current = getPos(e);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pt = getPos(e);
    const last = lastPtRef.current ?? pt;
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPtRef.current = pt;
    hasDrawnRef.current = true;
  }

  function onPointerUp(e: React.PointerEvent) {
    drawingRef.current = false;
    lastPtRef.current = null;
    try { drawCanvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  function clearDraw() {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
  }

  // Tightly crop the drawn canvas to its non-empty bounding box, return PNG data URL.
  function trimCanvasToPng(canvas: HTMLCanvasElement): string | null {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const a = data[(y * width + x) * 4 + 3];
        if (a > 10) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found) return null;
    const pad = 6;
    const cx = Math.max(0, minX - pad);
    const cy = Math.max(0, minY - pad);
    const cw = Math.min(width - cx, maxX - minX + pad * 2);
    const ch = Math.min(height - cy, maxY - minY + pad * 2);
    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    const octx = out.getContext('2d')!;
    octx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return out.toDataURL('image/png');
  }

  // ---- Type tab: render name to canvas ----
  function renderTypedToPng(): string | null {
    if (!typedName.trim()) return null;
    // measure
    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d')!;
    const fontSize = 48;
    mctx.font = `${fontSize}px ${typedFont}`;
    const metrics = mctx.measureText(typedName);
    const w = Math.ceil(metrics.width) + 20;
    const h = Math.ceil(fontSize * 1.4);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${fontSize}px ${typedFont}`;
    ctx.fillStyle = inkColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 10, h / 2);
    return canvas.toDataURL('image/png');
  }

  // ---- Upload tab ----
  function handleUploadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setUploadDataUrl(url);
      setUploadFormat(file.type === 'image/jpeg' ? 'jpg' : 'png');
    };
    reader.readAsDataURL(file);
  }

  function handleInsert() {
    if (tab === 'draw') {
      const url = trimCanvasToPng(drawCanvasRef.current!);
      if (url) onInsert(url, 'png');
    } else if (tab === 'type') {
      const url = renderTypedToPng();
      if (url) onInsert(url, 'png');
    } else if (tab === 'upload' && uploadDataUrl) {
      onInsert(uploadDataUrl, uploadFormat);
    }
  }

  const canInsert =
    tab === 'draw' ? hasDrawnRef.current
    : tab === 'type' ? typedName.trim().length > 0
    : !!uploadDataUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Add Signature</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-slate-200">
          {([
            { id: 'draw', label: 'Draw', icon: PenLine },
            { id: 'type', label: 'Type', icon: Type },
            { id: 'upload', label: 'Upload', icon: Upload },
          ] as const).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {tab === 'draw' && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-slate-500">Ink:</span>
                {INK_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setInkColor(c.value)}
                    className={`w-6 h-6 rounded-full border-2 ${inkColor === c.value ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
                <button
                  onClick={clearDraw}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-slate-600 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                >
                  <Trash2 size={13} /> Clear
                </button>
              </div>
              <canvas
                ref={drawCanvasRef}
                width={480}
                height={200}
                className="w-full bg-white rounded-lg border border-slate-200 touch-none cursor-crosshair"
                style={{ aspectRatio: '480 / 200' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
              />
              <p className="text-xs text-slate-400 mt-2">Draw your signature above with mouse or touch.</p>
            </div>
          )}

          {tab === 'type' && (
            <div>
              <input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 mb-3"
              />
              <div className="flex flex-col gap-2 mb-3">
                {TYPE_FONTS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setTypedFont(f.value)}
                    className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                      typedFont === f.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span style={{ fontFamily: f.value, fontSize: 26, color: inkColor }}>
                      {typedName || 'Your signature'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Ink:</span>
                {INK_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setInkColor(c.value)}
                    className={`w-6 h-6 rounded-full border-2 ${inkColor === c.value ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'}`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === 'upload' && (
            <div>
              <label className="block">
                <div className="w-full rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50">
                  <Upload size={26} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">Click to choose a PNG or JPG signature image</p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadFile(f);
                    }}
                  />
                </div>
              </label>
              {uploadDataUrl && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-center min-h-[80px]">
                  <img src={uploadDataUrl} alt="signature preview" className="max-h-24 object-contain" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded"
          >Cancel</button>
          <button
            onClick={handleInsert}
            disabled={!canInsert}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={15} /> Insert Signature
          </button>
        </div>
      </div>
    </div>
  );
}
