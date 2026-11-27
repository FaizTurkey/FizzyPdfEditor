import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import type { AddTextEdit, Edit, SignatureEdit, TextEdit } from '@/types';
import { hexToRgb01 } from './pdfCoords';

const fontCache = new Map<string, PDFFont>();

async function getFont(doc: PDFDocument, family: string, bold: boolean): Promise<PDFFont> {
  const key = `${family}-${bold}`;
  const cached = fontCache.get(key);
  if (cached) return cached;

  let font: PDFFont;
  if (family === 'Helvetica') {
    font = bold ? await doc.embedFont(StandardFonts.HelveticaBold) : await doc.embedFont(StandardFonts.Helvetica);
  } else if (family === 'Times Roman') {
    font = bold ? await doc.embedFont(StandardFonts.TimesRomanBold) : await doc.embedFont(StandardFonts.TimesRoman);
  } else {
    font = bold ? await doc.embedFont(StandardFonts.CourierBold) : await doc.embedFont(StandardFonts.Courier);
  }
  fontCache.set(key, font);
  return font;
}

export async function buildEditedPdf(originalBytes: Uint8Array, edits: Edit[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(originalBytes.slice(0));
  const pages = doc.getPages();

  for (const edit of edits) {
    const page = pages[edit.pageIndex];
    if (!page) continue;
    if (edit.kind === 'edit') await applyTextEdit(doc, page, edit);
    else if (edit.kind === 'add-text') await applyAddText(doc, page, edit);
    else if (edit.kind === 'signature') await applySignature(doc, page, edit);
  }

  return doc.save();
}

async function applyTextEdit(doc: PDFDocument, page: PDFPage, edit: TextEdit): Promise<void> {
  const font = await getFont(doc, edit.fontFamily, edit.bold);
  const bg = hexToRgb01(edit.bgColor);
  const text = hexToRgb01(edit.textColor);

  // Tight whiteout: cover only the glyph bounding box.
  // Top: ~0.75*fontSize above baseline (ascender). Bottom: ~0.5pt below baseline
  // (just enough to cover descenders) so underlines/borders beneath aren't hidden.
  const padX = 1.5;
  const padTop = 1;
  const padBottom = 0.5;
  const boxX = edit.x - padX;
  const boxY = edit.y - padBottom;
  const boxW = edit.width + padX * 2;
  const boxH = edit.fontSize * 0.85 + padTop + padBottom;

  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: rgb(bg.r, bg.g, bg.b) });
  page.drawText(edit.newText, { x: edit.x, y: edit.y, size: edit.fontSize, font, color: rgb(text.r, text.g, text.b) });

  if (edit.underline) {
    const textWidth = font.widthOfTextAtSize(edit.newText, edit.fontSize);
    const lineY = edit.y - edit.fontSize * 0.12;
    page.drawLine({
      start: { x: edit.x, y: lineY },
      end: { x: edit.x + textWidth, y: lineY },
      thickness: Math.max(0.75, edit.fontSize * 0.06),
      color: rgb(text.r, text.g, text.b),
    });
  }
}

async function applyAddText(doc: PDFDocument, page: PDFPage, edit: AddTextEdit): Promise<void> {
  const font = await getFont(doc, edit.fontFamily, edit.bold);
  const text = hexToRgb01(edit.textColor);

  // Optional background rectangle
  if (edit.bgColor && edit.bgColor !== 'transparent') {
    const bg = hexToRgb01(edit.bgColor);
    const pad = 2;
    const textWidth = font.widthOfTextAtSize(edit.text, edit.fontSize);
    const textHeight = font.heightAtSize(edit.fontSize);
    page.drawRectangle({
      x: edit.x - pad,
      y: edit.y - pad,
      width: textWidth + pad * 2,
      height: textHeight + pad * 2,
      color: rgb(bg.r, bg.g, bg.b),
    });
  }

  page.drawText(edit.text, { x: edit.x, y: edit.y, size: edit.fontSize, font, color: rgb(text.r, text.g, text.b) });

  if (edit.underline) {
    const textWidth = font.widthOfTextAtSize(edit.text, edit.fontSize);
    const lineY = edit.y - edit.fontSize * 0.12;
    page.drawLine({
      start: { x: edit.x, y: lineY },
      end: { x: edit.x + textWidth, y: lineY },
      thickness: Math.max(0.75, edit.fontSize * 0.06),
      color: rgb(text.r, text.g, text.b),
    });
  }
}

async function applySignature(doc: PDFDocument, page: PDFPage, edit: SignatureEdit): Promise<void> {
  let img;
  if (edit.format === 'jpg') {
    const bytes = dataUrlToBytes(edit.dataUrl);
    img = await doc.embedJpg(bytes);
  } else {
    const bytes = dataUrlToBytes(edit.dataUrl);
    img = await doc.embedPng(bytes);
  }
  page.drawImage(img, { x: edit.x, y: edit.y, width: edit.width, height: edit.height });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
