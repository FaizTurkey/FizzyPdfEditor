import type { TextItemInfo } from '@/types';

// pdfjs viewport uses a transform; we use Util.transform to get the final matrix
// then derive position. Returns info in unscaled PDF coordinate space.

export function extractTextItems(
  textContent: { items: Array<Record<string, unknown>> }
): TextItemInfo[] {
  const items: TextItemInfo[] = [];
  for (const raw of textContent.items) {
    const str = (raw as Record<string, unknown>).str as string | undefined;
    if (str === undefined || str === null) continue;
    if (typeof str !== 'string' || str.trim().length === 0) continue;

    const transform = (raw as Record<string, unknown>).transform as number[] | undefined;
    if (!transform || transform.length < 6) continue;

    const width = (raw as Record<string, unknown>).width as number | undefined;
    const height = (raw as Record<string, unknown>).height as number | undefined;
    const fontHeight = transform[3]; // d component ~ font size scale

    // fontSize = absolute value of d (vertical scale)
    const fontSize = Math.abs(fontHeight);

    items.push({
      str,
      transform: transform.slice(0, 6),
      width: typeof width === 'number' ? width : 0,
      height: typeof height === 'number' ? Math.abs(height) : fontSize,
      fontSize,
    });
  }
  return items;
}

// Get baseline (x,y) and box for a text item in unscaled PDF space.
// pdfjs transform = [a, b, c, d, e, f] where (e,f) is the text origin (baseline-left).
export function getPdfCoords(item: TextItemInfo): { x: number; y: number } {
  return { x: item.transform[4], y: item.transform[5] };
}

// Convert PDF coords (unscaled, y from bottom) to CSS pixels at given scale,
// given the page height (in unscaled PDF points).
export function pdfToCssX(xPdf: number, scale: number): number {
  return xPdf * scale;
}

export function pdfToCssYTop(yPdfBaseline: number, height: number, pageHeight: number, scale: number): number {
  // baseline y (bottom) -> top in CSS (y from top)
  const yTopPdf = pageHeight - yPdfBaseline; // top of text box in pdf-space (y from bottom)
  // The text box ascends above baseline; we treat height as fontSize. Use baseline as bottom.
  // For overlay, place box so its bottom ~ baseline. top = (pageHeight - baseline) * scale - height*scale
  return (pageHeight - yPdfBaseline) * scale - height * scale;
}

// Convert a hex color #rrggbb to RGB 0..1
export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return { r, g, b };
}
