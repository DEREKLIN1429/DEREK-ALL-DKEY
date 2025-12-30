export interface InventoryItem {
  name: string;
  qty: number; // Represents the most recently scanned quantity or primary display
  location: string;
  scanTime: string;
  // Specific cycle counts corresponding to Dropdown 1-5
  qty1?: number;
  qty2?: number;
  qty3?: number;
  qty4?: number;
  qty5?: number;
}

export interface InventoryMap {
  [code: string]: InventoryItem;
}

export interface AppSettings {
  decimals: number;
  minLen: number;
  maxLen: number;
  filenameFormat: string;
}

export type ScanMode = 'barcode' | 'ocr';

export type Language = 'zh-TW' | 'en' | 'hi';

// Declare external globals loaded via CDN
declare global {
  interface Window {
    Html5Qrcode: any;
    Tesseract: any;
  }
}