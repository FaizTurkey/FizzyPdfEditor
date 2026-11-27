export type FontFamily = 'Helvetica' | 'Times Roman' | 'Courier';

export type EditKind = 'edit' | 'add-text' | 'signature';

interface BaseEdit {
  id: string;
  kind: EditKind;
  pageIndex: number;
}

/** Edit an existing text item on the page (whiteout + replacement). */
export interface TextEdit extends BaseEdit {
  kind: 'edit';
  originalText: string;
  newText: string;
  // All coordinates in unscaled PDF coordinate space (points, y from bottom)
  x: number; // left x of text item
  y: number; // baseline y of text item
  width: number; // width of original text run
  height: number; // height (font size) of text run
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  underline: boolean;
  textColor: string; // hex like #rrggbb
  bgColor: string; // hex like #rrggbb (whiteout)
}

/** A new text box placed anywhere on the page (draggable). */
export interface AddTextEdit extends BaseEdit {
  kind: 'add-text';
  text: string;
  // unscaled PDF coords: x = left, y = bottom (baseline)
  x: number;
  y: number;
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  underline: boolean;
  textColor: string;
  bgColor: string; // 'transparent' or hex
}

/** A signature image placed on the page (draggable + resizable). */
export interface SignatureEdit extends BaseEdit {
  kind: 'signature';
  // unscaled PDF coords: x = left, y = bottom; width/height in points
  x: number;
  y: number;
  width: number;
  height: number;
  // PNG data URL (we always convert to PNG for consistent embed)
  dataUrl: string;
  format: 'png' | 'jpg';
}

export type Edit = TextEdit | AddTextEdit | SignatureEdit;

export interface TextItemInfo {
  str: string;
  transform: number[]; // [a,b,c,d,e,f]
  width: number;
  height: number;
  fontSize: number;
}

export interface PdfState {
  fileName: string;
  pageCount: number;
  originalBytes: Uint8Array;
}
