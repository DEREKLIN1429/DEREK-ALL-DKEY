import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// ==========================================
// 1. TYPES
// ==========================================
export interface InventoryItem {
  name: string;
  qty: number;
  location: string;
  scanTime: string;
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

declare global {
  interface Window {
    Html5Qrcode: any;
    Tesseract: any;
  }
}

// ==========================================
// 2. CONSTANTS
// ==========================================
export const SYSTEM_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxN5It2eczVQ1oL0uE9cjEC8sqKITOMKJdl9_jMx7Z7taFNdEMb5LdyjErhARNHno4JXA/exec",
  SHEET_URL: "https://docs.google.com/spreadsheets/d/1_85YEZSQFARb7HgA2hfNOj4bxoptdjqQfAqq3Y0uY9o/edit?gid=0#gid=0"
};

export const DEFAULT_SETTINGS: AppSettings = {
  decimals: 2,
  minLen: 4,
  maxLen: 50,
  filenameFormat: "USER_YYYYMMDDHHmmss"
};

export const TRANSLATIONS = {
  'zh-TW': {
    appTitle: "Mixing Inventory",
    user: "人員 (User)",
    cycleCount: "盤點 (No.)",
    defaultG: "0️⃣ 預設 (G欄)",
    count1: "1️⃣ 盤點 1 (H欄)",
    count2: "2️⃣ 盤點 2 (I欄)",
    count3: "3️⃣ 盤點 3 (J欄)",
    count4: "4️⃣ 盤點 4 (K欄)",
    count5: "5️⃣ 盤點 5 (L欄)",
    modeBarcode: "條碼/QR",
    modeBarcodeSub: "Barcode & QR",
    modeOCR: "文字識別",
    modeOCRSub: "OCR Text",
    clear: "清除",
    settings: "設定",
    flash: "補光燈",
    flashOff: "關閉補光燈",
    export: "匯出",
    openSheet: "開啟試算表",
    upload: "上傳資料",
    tableCode: "唯一碼 (Code)",
    tableLoc: "儲位",
    tableName: "品名",
    tableQty: "數量",
    tableAct: "操作",
    noData: "暫無資料 (No Data)",
    confirmCode: "1️⃣ 確認條碼 (Code):",
    confirmName: "2️⃣ 品名 (Name):",
    confirmQty: "3️⃣ 數量 (Qty):",
    confirmLoc: "4️⃣ 儲位 (Location):",
    tooShort: "❌ 太短 (Min: ",
    tooLong: "❌ 太長 (Max: ",
    deleteConfirm: "刪除項目 (Delete): ",
    clearFieldConfirm: "清除此欄位數值? ",
    clearAllConfirm: "清除所有資料? (Clear All?)",
    uploadConfirm: "上傳至雲端?\n\n⚠️ 注意：若程式端欄位為空白，將保留雲端原有資料；僅有數值之欄位會進行更新。\n\n是否繼續？",
    uploadSuccess: "✅ 上傳成功",
    uploadFail: "❌ 上傳失敗: ",
    exportSuccess: "✅ 匯出完成",
    settingsTitle: "⚙️ 系統設定",
    decLabel: "小數點位數 (Decimal):",
    minLabel: "最少辨識字元 (Min):",
    maxLabel: "最大辨識字元 (Max):",
    fileFmtLabel: "匯出檔名格式:",
    save: "儲存",
    cancel: "取消",
    scannerStart: "👆 點擊畫面開始掃描",
    scannerClick: "",
    ocrProcessing: "處理中...",
    ocrReady: "✅ 識別就緒",
    ocrWait: "👀 掃描中... 請對準文字",
    ocrTap: "👆 點擊畫面抓取",
    langSelect: "選擇語言 (Select Language)",
    editPrompt: "輸入數值 (Enter Value):",
    authChecking: "正在驗證權限...",
    authDeniedTitle: "存取被拒 (Access Denied)",
    authDeniedMsg: "您無權限使用此系統，請申請 Google Sheet 編輯者權限。",
    authRetry: "重新驗證",
    scanDetected: "🔍 已偵測：",
    scanConfirm: "(再次點擊畫面確認)",
    scanHint: "👀 掃描中... 請對準目標"
  },
  'en': {
    appTitle: "Mixing Inventory",
    user: "User",
    cycleCount: "Cycle Count",
    defaultG: "0️⃣ Default (Col G)",
    count1: "1️⃣ Count 1 (Col H)",
    count2: "2️⃣ Count 2 (Col I)",
    count3: "3️⃣ Count 3 (Col J)",
    count4: "4️⃣ Count 4 (Col K)",
    count5: "5️⃣ Count 5 (Col L)",
    modeBarcode: "Barcode/QR",
    modeBarcodeSub: "Scan Code",
    modeOCR: "OCR Text",
    modeOCRSub: "Recognize Text",
    clear: "Clear",
    settings: "Settings",
    flash: "Flash",
    flashOff: "Flash Off",
    export: "Export",
    openSheet: "Open Sheet",
    upload: "Upload Data",
    tableCode: "Code",
    tableLoc: "Loc",
    tableName: "Name",
    tableQty: "Qty",
    tableAct: "Action",
    noData: "No Data",
    confirmCode: "1️⃣ Confirm Code:",
    confirmName: "2️⃣ Name:",
    confirmQty: "3️⃣ Quantity:",
    confirmLoc: "4️⃣ Location:",
    tooShort: "❌ Too short (Min: ",
    tooLong: "❌ Too long (Max: ",
    deleteConfirm: "Delete Item: ",
    clearFieldConfirm: "Clear value for field? ",
    clearAllConfirm: "Clear All Data?",
    uploadConfirm: "Upload to cloud?\n\n⚠️ Note: Empty fields will NOT overwrite existing cloud data. Only fields with values will be updated.\n\nContinue?",
    uploadSuccess: "✅ Upload Success",
    uploadFail: "❌ Upload Failed: ",
    exportSuccess: "✅ Export Done",
    settingsTitle: "⚙️ System Settings",
    decLabel: "Decimals:",
    minLabel: "Min Length:",
    maxLabel: "Max Length:",
    fileFmtLabel: "Filename Format:",
    save: "Save",
    cancel: "Cancel",
    scannerStart: "👆 Tap to Start Scan",
    scannerClick: "",
    ocrProcessing: "Processing...",
    ocrReady: "✅ Ready",
    ocrWait: "👀 Scanning... Align Text",
    ocrTap: "👆 Tap to Capture",
    langSelect: "Select Language",
    editPrompt: "Enter Value:",
    authChecking: "Checking Permissions...",
    authDeniedTitle: "Access Denied",
    authDeniedMsg: "You do not have permission. Please request Google Sheet Editor access.",
    authRetry: "Retry",
    scanDetected: "🔍 Detected: ",
    scanConfirm: "(Tap again to confirm)",
    scanHint: "👀 Scanning... Align Code"
  },
  'hi': {
    appTitle: "मिक्सिंग इन्वेंटरी",
    user: "उपयोगकर्ता (User)",
    cycleCount: "साइकिल गिनती (No.)",
    defaultG: "0️⃣ डिफ़ॉल्ट (Col G)",
    count1: "1️⃣ गिनती 1 (Col H)",
    count2: "2️⃣ गिनती 2 (Col I)",
    count3: "3️⃣ गिनती 3 (Col J)",
    count4: "4️⃣ गिनती 4 (Col K)",
    count5: "5️⃣ गिनती 5 (Col L)",
    modeBarcode: "बारकोड/QR",
    modeBarcodeSub: "Scan Code",
    modeOCR: "टेक्स्ट स्कैन (OCR)",
    modeOCRSub: "Recognize Text",
    clear: "साफ़ करें",
    settings: "सेटिंग्स",
    flash: "फ्लैश",
    flashOff: "फ्लैश बंद",
    export: "निर्यात (Export)",
    openSheet: "शीट खोलें",
    upload: "डेटा अपलोड",
    tableCode: "कोड",
    tableLoc: "स्थान",
    tableName: "नाम",
    tableQty: "मात्रा",
    tableAct: "क्रिया",
    noData: "कोई डेटा नहीं (No Data)",
    confirmCode: "1️⃣ कोड की पुष्टि करें:",
    confirmName: "2️⃣ नाम:",
    confirmQty: "3️⃣ मात्रा (Qty):",
    confirmLoc: "4️⃣ स्थान (Location):",
    tooShort: "❌ बहुत छोटा (Min: ",
    tooLong: "❌ बहुत लंबा (Max: ",
    deleteConfirm: "हटाएं (Delete): ",
    clearFieldConfirm: "इस मान को साफ़ करें? ",
    clearAllConfirm: "सारा डेटा साफ़ करें?",
    uploadConfirm: "क्लाउड पर अपलोड करें?\n\n⚠️ खाली फ़ील्ड मौजूदा डेटा को ओवरराइट नहीं करेंगे। केवल मान वाले फ़ील्ड ही अपडेट किए जाएंगे।\n\nजारी रखें?",
    uploadSuccess: "✅ अपलोड सफल",
    uploadFail: "❌ अपलोड विफल: ",
    exportSuccess: "✅ निर्यात पूर्ण",
    settingsTitle: "⚙️ सेटिंग्स",
    decLabel: "दशमलव (Decimals):",
    minLabel: "न्यूनतम लंबाई:",
    maxLabel: "अधिकतम लंबाई:",
    fileFmtLabel: "फाइल नाम प्रारूप:",
    save: "सहेजें",
    cancel: "रद्द करें",
    scannerStart: "👆 स्कैन शुरू करने के लिए टैप करें",
    scannerClick: "",
    ocrProcessing: "प्रक्रिया जारी है...",
    ocrReady: "✅ तैयार",
    ocrWait: "👀 टेक्स्ट संरेखित करें",
    ocrTap: "👆 कैप्चर करें",
    langSelect: "भाषा चुनें (Select Language)",
    editPrompt: "मान दर्ज करें (Enter Value):",
    authChecking: "अनुमतियों की जाँच...",
    authDeniedTitle: "पहुँच अस्वीकृत",
    authDeniedMsg: "आपके पास अनुमति नहीं है। कृपया संपादक (Editor) पहुँच का अनुरोध करें।",
    authRetry: "पुनः प्रयास करें",
    scanDetected: "🔍 पता चला: ",
    scanConfirm: "(पुष्टि करने के लिए फिर से टैप करें)",
    scanHint: "👀 स्कैनिंग... कोड संरेखित करें"
  }
};

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================
const playBeep = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine"; 
        osc.frequency.setValueAtTime(1500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
        setTimeout(() => { if (ctx.state !== 'closed') ctx.close(); }, 200);
    } catch (e) {}
};

// ==========================================
// 4. COMPONENTS
// ==========================================

// --- Scanner Component ---
interface ScannerProps {
  mode: ScanMode;
  onScan: (text: string) => void;
  isScanning: boolean;
  onToggleScan: (active: boolean) => void;
  language: Language;
  minLen: number;
  maxLen: number;
  flashOn: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ 
  mode, 
  onScan, 
  isScanning, 
  onToggleScan,
  language,
  minLen,
  maxLen,
  flashOn
}) => {
  const barcodeScannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const t = TRANSLATIONS[language];
  
  const [ocrQuality, setOcrQuality] = useState(false);
  const [ocrText, setOcrText] = useState(t.ocrWait);
  const [streamTrack, setStreamTrack] = useState<MediaStreamTrack | null>(null);
  const ocrIntervalRef = useRef<number | null>(null);

  const [tempCode, setTempCode] = useState<string | null>(null);

  useEffect(() => {
      if (!isScanning) {
          setTempCode(null);
          setOcrText(t.ocrWait);
      }
  }, [language, isScanning, t.ocrWait]);

  const clearOverlay = () => {
      if (overlayCanvasRef.current) {
          const ctx = overlayCanvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
      }
  };

  const startBarcodeScanner = useCallback(async () => {
    if (!window.Html5Qrcode) {
        alert("Error: Html5Qrcode library not loaded.");
        return;
    }
    
    if (barcodeScannerRef.current) {
        try { await barcodeScannerRef.current.stop(); barcodeScannerRef.current.clear(); } catch(e) {}
    }

    if (!document.getElementById("reader")) return;

    const html5QrCode = new window.Html5Qrcode("reader");
    barcodeScannerRef.current = html5QrCode;

    const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 250 }, 
        aspectRatio: 1.0,
        disableFlip: false 
    };
    
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText: string, decodedResult: any) => {
            if (tempCode !== decodedText) {
                 setTempCode(decodedText);
                 playBeep(); 
            }
        },
        (errorMessage: string) => {}
      );
      
      if (flashOn) {
         setTimeout(() => {
             try {
                if(html5QrCode.getState() === 2) {
                   html5QrCode.applyVideoConstraints({ advanced: [{ torch: true }] }).catch(() => {});
                }
             } catch(e) {}
         }, 500);
      }
      
    } catch (err) {
      console.error("Error starting barcode scanner", err);
      alert(`Camera failed: ${err}`);
      onToggleScan(false);
    }
  }, [onToggleScan, tempCode, flashOn]);

  const stopBarcodeScanner = useCallback(async () => {
    if (barcodeScannerRef.current) {
      try {
        await barcodeScannerRef.current.stop();
        barcodeScannerRef.current.clear();
      } catch (e) {}
      barcodeScannerRef.current = null;
      clearOverlay();
    }
  }, []);

  const startOcrCamera = useCallback(async () => {
    try {
      const constraints = { 
          video: { 
              facingMode: "environment", 
              width: { ideal: 3840 }, 
              height: { ideal: 2160 },
              focusMode: "continuous"
          } 
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        setStreamTrack(track);
        
        if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
        ocrIntervalRef.current = window.setInterval(analyzeFrame, 300);
      }
    } catch (err) {
      alert("OCR Camera Error: " + err);
      onToggleScan(false);
    }
  }, [onToggleScan]);

  const stopOcrCamera = useCallback(() => {
    if (streamTrack) {
      streamTrack.stop();
      setStreamTrack(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
      ocrIntervalRef.current = null;
    }
  }, [streamTrack]);

  const analyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    
    if (video.readyState === 4) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if(!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const cropWidth = canvas.width * 0.9;
        const cropHeight = canvas.height * 0.045;
        const cropX = (canvas.width - cropWidth) / 2;
        const cropY = (canvas.height - cropHeight) / 2;
        
        ctx.drawImage(video, 0, 0);
        const imgData = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);
        
        const score = calculateContrast(imgData.data);
        setOcrQuality(score > 40);
    }
  };

  const calculateContrast = (data: Uint8ClampedArray) => {
    let sum = 0, count = 0;
    for (let i = 0; i < data.length; i += 80) {
        sum += (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114); count++;
    }
    const mean = sum / count;
    let variance = 0;
    for (let i = 0; i < data.length; i += 80) {
        const gray = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
        variance += Math.pow(gray - mean, 2);
    }
    return Math.sqrt(variance / count);
  };

  const captureOcr = async () => {
    if (!videoRef.current || !window.Tesseract) return;
    setOcrText(t.ocrProcessing);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    const cropHeight = canvas.height * 0.045; 
    const cropY = (canvas.height - cropHeight) / 2;
    
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = canvas.width;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext('2d');
    
    cropCtx?.drawImage(canvas, 0, cropY, canvas.width, cropHeight, 0, 0, cropCanvas.width, cropCanvas.height);
    
    try {
        const { data: { text } } = await window.Tesseract.recognize(
            cropCanvas.toDataURL('image/jpeg'),
            'eng',
            { 
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-',
                tessedit_pageseg_mode: '7' 
            }
        );

        let cleanText = text.replace(/[^a-zA-Z0-9.-]/g, "");
        const strongPattern = /[A-Z0-9]+(-[A-Z0-9.]+){3,}/;
        const match = cleanText.match(strongPattern);
        if (match) { cleanText = match[0]; }
        cleanText = cleanText.replace(/^[-.]+|[-.]+$/g, "");

        if(cleanText.length > 2) { 
            playBeep();
            onScan(cleanText);
            setOcrText(t.ocrWait);
        } else {
            setOcrText("⚠️ No text detected");
        }
    } catch (err) {
        alert("OCR Error: " + err);
        setOcrText(t.ocrWait);
    }
  };

  useEffect(() => {
    const manageCamera = async () => {
      await stopBarcodeScanner();
      stopOcrCamera();

      if (isScanning) {
        setTempCode(null);
        if (mode === 'barcode') {
          setTimeout(() => startBarcodeScanner(), 300);
        } else {
          setTimeout(() => startOcrCamera(), 300);
        }
      }
    };
    manageCamera();
    return () => {
      stopBarcodeScanner();
      stopOcrCamera();
    };
  }, [mode, isScanning]);

  useEffect(() => {
    const toggleFlash = async () => {
        if (!isScanning) return;
        
        try {
            if (mode === 'barcode' && barcodeScannerRef.current) {
                if (barcodeScannerRef.current.getState() === 2) { 
                    await barcodeScannerRef.current.applyVideoConstraints({
                        advanced: [{ torch: flashOn }]
                    });
                }
            } else if (mode === 'ocr' && streamTrack) {
                await streamTrack.applyConstraints({
                    advanced: [{ torch: flashOn }]
                } as any);
            }
        } catch (err) {
            console.warn("Flash toggle failed or unsupported", err);
        }
    };
    toggleFlash();
  }, [flashOn, isScanning, mode, streamTrack]);

  const handleViewportClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isScanning) {
        onToggleScan(true);
    } else {
        if (mode === 'barcode') {
            if (tempCode) {
                 const confirmMsg = (language === 'zh-TW') 
                    ? `掃描到資料：\n${tempCode}\n\n確定要使用嗎？` 
                    : `Scanned Data:\n${tempCode}\n\nConfirm to use?`;
                    
                 if (window.confirm(confirmMsg)) {
                     onScan(tempCode);
                 } else {
                     setTempCode(null);
                 }
            }
        } else if (mode === 'ocr') {
            captureOcr();
        }
    }
  };

  return (
    <div className="viewport" onClick={handleViewportClick}>
        {mode === 'barcode' && (
           <>
             <div id="reader" style={{display: isScanning ? 'block' : 'none'}}></div>
             <canvas id="qr-canvas" ref={overlayCanvasRef} style={{display: isScanning ? 'block' : 'none'}} />
             <div id="center-guide" className={tempCode ? 'guide-success' : ''} style={{display: isScanning ? 'block' : 'none'}}></div>
             <div id="cam-hint-text" className="camera-hint" style={{display: isScanning ? 'flex' : 'none'}}>
                {tempCode ? `${t.scanDetected}\n${tempCode}\n${t.scanConfirm}` : t.scannerStart}
             </div>
             {!isScanning && (
                <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', pointerEvents:'none'}}>
                    <div style={{fontSize:'3rem', marginBottom:'10px', opacity:0.8}}>📷</div>
                    <div style={{fontSize:'1.2rem', fontWeight:'bold'}}>{t.scannerStart}</div>
                </div>
             )}
           </>
        )}

        {mode === 'ocr' && (
           <>
             <video id="ocr-video" ref={videoRef} autoPlay playsInline style={{display: isScanning ? 'block' : 'none'}} />
             <canvas ref={canvasRef} className="hidden" />
             <div id="ocr-overlay" className="scan-guide-overlay" style={{display: isScanning ? 'block' : 'none'}}>
                <div className={`guide-box ${ocrQuality ? 'ready' : ''} ${!isScanning ? 'paused' : ''}`}>
                   <div className="guide-line"></div>
                   <div className="guide-text">
                      {ocrText === t.ocrProcessing ? t.ocrProcessing : (ocrQuality ? t.ocrReady : t.ocrWait)}
                   </div>
                </div>
             </div>
             {!isScanning && (
                <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', pointerEvents:'none'}}>
                    <div style={{fontSize:'3rem', marginBottom:'10px', opacity:0.8}}>📝</div>
                    <div style={{fontSize:'1.2rem', fontWeight:'bold'}}>{t.scannerStart}</div>
                </div>
             )}
           </>
        )}
    </div>
  );
};

// --- SettingsModal Component ---
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, language, onLanguageChange }) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const t = TRANSLATIONS[language];

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#333] border border-[#555] rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-5 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl text-center font-bold text-[#17a2b8] mb-4">{t.settingsTitle}</h3>
        
        <div className="mb-6 border-b border-gray-600 pb-4">
             <label className="block text-gray-300 text-sm mb-2 font-bold">{t.langSelect}</label>
             <select 
               value={language}
               onChange={(e) => onLanguageChange(e.target.value as Language)}
               className="w-full p-3 rounded bg-[#222] border border-[#555] text-white focus:outline-none focus:border-[#17a2b8] text-lg"
             >
                <option value="zh-TW">中文 (繁體)</option>
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
             </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 text-sm mb-1">{t.decLabel}</label>
          <select 
            value={localSettings.decimals}
            onChange={(e) => handleChange('decimals', parseInt(e.target.value))}
            className="w-full p-2 rounded bg-[#222] border border-[#555] text-white focus:outline-none focus:border-[#17a2b8]"
          >
            {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="flex gap-4 mb-4">
            <div className="flex-1">
                <label className="block text-gray-300 text-sm mb-1">{t.minLabel}</label>
                <input 
                    type="number" 
                    value={localSettings.minLen}
                    onChange={(e) => handleChange('minLen', parseInt(e.target.value))}
                    className="w-full p-2 rounded bg-[#222] border border-[#555] text-white focus:outline-none focus:border-[#17a2b8]"
                />
            </div>
            <div className="flex-1">
                <label className="block text-gray-300 text-sm mb-1">{t.maxLabel}</label>
                <input 
                    type="number" 
                    value={localSettings.maxLen}
                    onChange={(e) => handleChange('maxLen', parseInt(e.target.value))}
                    className="w-full p-2 rounded bg-[#222] border border-[#555] text-white focus:outline-none focus:border-[#17a2b8]"
                />
            </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 text-sm mb-1">{t.fileFmtLabel}</label>
          <input 
            type="text" 
            value={localSettings.filenameFormat}
            onChange={(e) => handleChange('filenameFormat', e.target.value)}
            className="w-full p-2 rounded bg-[#222] border border-[#555] text-white focus:outline-none focus:border-[#17a2b8]"
          />
          <div className="text-xs text-gray-400 mt-1">Available: USER, YYYY, MM, DD, HH, mm, ss</div>
        </div>

        <div className="mb-4">
          <label className="block text-[#007bff] text-sm mb-1 font-bold">☁️ Google Script API (Upload):</label>
          <input 
            type="text" 
            value={SYSTEM_CONFIG.API_URL}
            disabled
            readOnly
            className="w-full p-2 rounded bg-[#444] border-none text-[#aaa] text-xs cursor-not-allowed"
          />
        </div>

        <div className="mb-6">
          <label className="block text-[#6610f2] text-sm mb-1 font-bold">📊 Google Sheet (View):</label>
          <input 
            type="text" 
            value={SYSTEM_CONFIG.SHEET_URL}
            disabled
            readOnly
            className="w-full p-2 rounded bg-[#444] border-none text-[#aaa] text-xs cursor-not-allowed"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white font-bold transition-colors"
          >
            {t.cancel}
          </button>
          <button 
            onClick={() => onSave(localSettings)}
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
          >
            {t.save}
          </button>
        </div>

      </div>
    </div>
  );
};

// --- InventoryTable Component ---
interface InventoryTableProps {
  inventory: InventoryMap;
  settings: AppSettings;
  onEdit: (code: string) => void;
  onDelete: (code: string) => void;
  onUpdateField: (code: string, field: keyof InventoryItem) => void;
  checkIndex: number;
  language: Language;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ inventory, settings, onEdit, onDelete, onUpdateField, checkIndex, language }) => {
  const items = (Object.entries(inventory) as [string, InventoryItem][]).reverse();
  const t = TRANSLATIONS[language];

  const renderQtyCell = (code: string, val: number | undefined, field: keyof InventoryItem, isCurrentMode: boolean) => {
      const hasValue = val !== undefined && val !== 0;
      const displayVal = hasValue ? val?.toFixed(settings.decimals) : '-';
      
      return (
          <td 
            className={`px-2 py-1 text-center font-bold text-base cursor-pointer hover:bg-blue-100 transition-colors ${isCurrentMode ? (hasValue ? 'text-green-600' : 'text-gray-300') : 'text-gray-400'}`}
            onClick={(e) => {
                e.stopPropagation();
                onUpdateField(code, field);
            }}
            title="Click to edit value"
          >
            {displayVal}
          </td>
      );
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md border border-gray-600 mt-2">
      <div className="overflow-x-auto w-full">
        <table className="min-w-full border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#333] text-white text-xs uppercase tracking-wider">
              <th className="px-2 py-1 text-left border-b border-[#555]">{t.tableCode}</th>
              <th className="px-2 py-1 text-center border-b border-[#555]">{t.tableLoc}</th>
              <th className="px-2 py-1 text-left border-b border-[#555]">{t.tableName}</th>
              <th className={`px-2 py-1 text-center border-b border-[#555] ${checkIndex === 0 ? 'text-[#f1c40f] bg-[#444]' : ''}`}>{t.tableQty}</th>
              <th className={`px-2 py-1 text-center border-b border-[#555] ${checkIndex === 1 ? 'text-[#f1c40f] bg-[#444]' : ''}`}>Q1</th>
              <th className={`px-2 py-1 text-center border-b border-[#555] ${checkIndex === 2 ? 'text-[#f1c40f] bg-[#444]' : ''}`}>Q2</th>
              <th className={`px-2 py-1 text-center border-b border-[#555] ${checkIndex === 3 ? 'text-[#f1c40f] bg-[#444]' : ''}`}>Q3</th>
              <th className={`px-2 py-1 text-center border-b border-[#555] ${checkIndex === 4 ? 'text-[#f1c40f] bg-[#444]' : ''}`}>Q4</th>
              <th className={`px-2 py-1 text-center border-b border-[#555] ${checkIndex === 5 ? 'text-[#f1c40f] bg-[#444]' : ''}`}>Q5</th>
              <th className="px-2 py-1 text-center border-b border-[#555]">{t.tableAct}</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {items.map(([code, item], index) => {
              return (
                <tr key={code} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors border-b border-gray-200`}>
                  <td className="px-2 py-1 font-mono text-[#007bff] font-bold cursor-pointer" onClick={() => onEdit(code)}>
                    {code}
                  </td>
                  <td className="px-2 py-1 text-center text-[#d39e00] font-bold">{item.location || '-'}</td>
                  <td className="px-2 py-1 text-gray-700 max-w-[100px] truncate">{item.name}</td>
                  {renderQtyCell(code, item.qty, 'qty', checkIndex === 0)}
                  {renderQtyCell(code, item.qty1, 'qty1', checkIndex === 1)}
                  {renderQtyCell(code, item.qty2, 'qty2', checkIndex === 2)}
                  {renderQtyCell(code, item.qty3, 'qty3', checkIndex === 3)}
                  {renderQtyCell(code, item.qty4, 'qty4', checkIndex === 4)}
                  {renderQtyCell(code, item.qty5, 'qty5', checkIndex === 5)}
                  <td className="px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onEdit(code)} className="w-7 h-7 rounded bg-yellow-100 text-yellow-600 hover:bg-yellow-200 flex items-center justify-center">✏️</button>
                      <button onClick={() => onDelete(code)} className="w-7 h-7 rounded bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center">🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={10} className="p-4 text-center text-gray-500 italic">{t.noData}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 5. MAIN APP
// ==========================================
const App: React.FC = () => {
  const [user, setUser] = useState<string>("Default");
  const [checkIndex, setCheckIndex] = useState<number>(0);
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isScanning, setIsScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [authStatus, setAuthStatus] = useState<'pending' | 'authorized' | 'unauthorized'>('authorized');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [language, setLanguage] = useState<Language>('zh-TW');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser') || "Default";
    setUser(savedUser);
    
    const savedLang = localStorage.getItem('appLanguage') as Language;
    if (savedLang && ['zh-TW', 'en', 'hi'].includes(savedLang)) {
        setLanguage(savedLang);
    }

    const savedIndex = localStorage.getItem('lastCheckIndex');
    if (savedIndex) setCheckIndex(parseInt(savedIndex));
    
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings({...DEFAULT_SETTINGS, ...JSON.parse(savedSettings)});
    }

    loadInventory(savedUser);
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
        const response = await fetch(SYSTEM_CONFIG.API_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "checkAuth" })
        });
        const text = await response.text();
        try {
            const result = JSON.parse(text);
            if (result && result.email) setCurrentUserEmail(result.email);
        } catch (e) {
            console.warn("Backend legacy script or offline.");
        }
    } catch (e) {
        console.warn("Auth check failed (Network).");
    }
  };

  const changeLanguage = (lang: Language) => {
      setLanguage(lang);
      localStorage.setItem('appLanguage', lang);
      setIsLangModalOpen(false);
  };

  const loadInventory = (userId: string) => {
    const data = localStorage.getItem(`inventory_${userId}`);
    setInventory(data ? JSON.parse(data) : {});
  };

  const handleUserChange = (newUser: string) => {
    const cleanUser = newUser.trim() || "Default";
    setUser(cleanUser);
    localStorage.setItem('currentUser', cleanUser);
    loadInventory(cleanUser);
    setTimeout(() => alert(`👋 Switched to: ${cleanUser}`), 100);
  };
  
  const handleCheckIndexChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = parseInt(e.target.value);
      setCheckIndex(val);
      localStorage.setItem('lastCheckIndex', val.toString());
  };

  const handleSaveItem = (initialCode: string) => {
    setIsScanning(false);
    
    setTimeout(() => {
        let code = prompt(t.confirmCode, initialCode);
        if (code === null) return;
        
        code = code.replace(/[^a-zA-Z0-9.-]/g, "").trim();
        if (!code) return;

        if (code.length < settings.minLen) {
            alert(`${t.tooShort}${settings.minLen})`);
            return;
        }
        if (code.length > settings.maxLen) {
            alert(`${t.tooLong}${settings.maxLen})`);
            return;
        }

        const existingItem = inventory[code];
        const lastLocation = localStorage.getItem('lastLocation') || "";
        const defaultName = existingItem ? existingItem.name : (code.split('-')[0] || "");
        
        let currentStoredQty: number | undefined;
        if (checkIndex === 0) {
            currentStoredQty = existingItem?.qty;
        } else {
            // @ts-ignore
            currentStoredQty = existingItem ? existingItem[`qty${checkIndex}`] : undefined;
        }

        const defaultQty = currentStoredQty !== undefined ? currentStoredQty.toString() : "";
        const defaultLoc = existingItem ? existingItem.location : lastLocation;

        const name = prompt(t.confirmName, defaultName);
        if (name === null) return;

        const qtyStr = prompt(t.confirmQty, "");
        if (qtyStr === null) return;
        
        let qty = parseFloat(qtyStr);
        if (isNaN(qty)) qty = 0;

        let location = prompt(t.confirmLoc, defaultLoc);
        if (location === null) return;
        location = location.trim();

        if (location) {
            localStorage.setItem('lastLocation', location);
        }

        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const nd = new Date(utc + (3600000 * 5.5));
        const istTime = nd.toISOString().replace(/T/, ' ').replace(/\..+/, '');

        const newItem: InventoryItem = {
            name: name || "No Name",
            location,
            scanTime: istTime,
            qty: (checkIndex === 0) ? qty : (existingItem ? existingItem.qty : 0),
            qty1: (checkIndex === 1) ? qty : (existingItem?.qty1),
            qty2: (checkIndex === 2) ? qty : (existingItem?.qty2),
            qty3: (checkIndex === 3) ? qty : (existingItem?.qty3),
            qty4: (checkIndex === 4) ? qty : (existingItem?.qty4),
            qty5: (checkIndex === 5) ? qty : (existingItem?.qty5),
        };

        const newInventory = { ...inventory, [code]: newItem };
        setInventory(newInventory);
        localStorage.setItem(`inventory_${user}`, JSON.stringify(newInventory));

    }, 100);
  };

  const handleDelete = (code: string) => {
    if (confirm(`${t.deleteConfirm}${code}?`)) {
      const newInv = { ...inventory };
      delete newInv[code];
      setInventory(newInv);
      localStorage.setItem(`inventory_${user}`, JSON.stringify(newInv));
    }
  };

  const handleUpdateQty = (code: string, field: keyof InventoryItem) => {
      const item = inventory[code];
      if (!item) return;

      const currentVal = field === 'qty' ? item.qty : item[field];
      const displayVal = (currentVal !== undefined && currentVal !== 0) ? currentVal : "";

      const newValStr = prompt(`${t.editPrompt} (${field})`, String(displayVal));
      if (newValStr === null) return;

      let newVal: number | undefined;
      
      if (newValStr.trim() === "") {
          newVal = field === 'qty' ? 0 : undefined;
      } else {
          const parsed = parseFloat(newValStr);
          if (isNaN(parsed)) {
              alert("Invalid Number");
              return;
          }
          newVal = parsed;
      }

      const newItem = { ...item, [field]: newVal };
      const newInventory = { ...inventory, [code]: newItem };
      setInventory(newInventory);
      localStorage.setItem(`inventory_${user}`, JSON.stringify(newInventory));
  };

  const handleClear = () => {
    if (confirm(t.clearAllConfirm)) {
      setInventory({});
      localStorage.setItem(`inventory_${user}`, JSON.stringify({}));
    }
  };

  const handleExport = () => {
    if (Object.keys(inventory).length === 0) return alert(t.noData);
    
    try {
        let csv = "\uFEFFCode,Spec,Location,Name,Qty_Current,Qty1,Qty2,Qty3,Qty4,Qty5,Time\n";
        
        const sortedItems = (Object.entries(inventory) as [string, InventoryItem][])
            .sort(([, a], [, b]) => b.scanTime.localeCompare(a.scanTime));

        sortedItems.forEach(([k, v]) => {
            const safeName = (v.name || "").replace(/,/g, " ").replace(/"/g, "");
            const loc = (v.location || "").replace(/,/g, " ");
            const parts = k.split('-');
            const middleTxt = parts.length >= 3 ? parts[1] : "";
            
            const qC = v.qty.toFixed(settings.decimals);
            const q1 = (v.qty1 || 0).toFixed(settings.decimals);
            const q2 = (v.qty2 || 0).toFixed(settings.decimals);
            const q3 = (v.qty3 || 0).toFixed(settings.decimals);
            const q4 = (v.qty4 || 0).toFixed(settings.decimals);
            const q5 = (v.qty5 || 0).toFixed(settings.decimals);

            csv += `="${k}","${middleTxt}","${loc}","${safeName}",${qC},${q1},${q2},${q3},${q4},${q5},"${v.scanTime}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const now = new Date(utc + (3600000 * 5.5));
        
        const pad = (n: number) => String(n).padStart(2, '0');
        const mapObj: any = {
            USER: user,
            YYYY: now.getFullYear(),
            MM: pad(now.getMonth() + 1),
            DD: pad(now.getDate()),
            HH: pad(now.getHours()),
            mm: pad(now.getMinutes()),
            ss: pad(now.getSeconds())
        };
        
        let filename = settings.filenameFormat;
        Object.keys(mapObj).forEach(key => {
            filename = filename.replace(key, mapObj[key]);
        });
        if (!filename.endsWith(".csv")) filename += ".csv";

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert(t.exportSuccess);
    } catch (e) {
        alert("Export Error: " + e);
    }
  };

  const handleUpload = async () => {
    if (Object.keys(inventory).length === 0) return alert(t.noData);
    
    if (!confirm(t.uploadConfirm)) return;

    setIsLoading(true);
    setLoadingText("Uploading...");

    try {
        const filteredInventory: any = {};
        
        const sortedItems = (Object.entries(inventory) as [string, InventoryItem][])
            .sort(([, a], [, b]) => b.scanTime.localeCompare(a.scanTime));

        sortedItems.forEach(([key, item]) => {
            // Start with base info
            const cleanItem: any = {
                name: item.name,
                location: item.location,
                scanTime: item.scanTime
            };

            // Requirement: Only include quantity fields if they are not blank/zero/null
            // to prevent overwriting valid data in Excel with empty strings.
            const qtyFields: (keyof InventoryItem)[] = ['qty', 'qty1', 'qty2', 'qty3', 'qty4', 'qty5'];
            qtyFields.forEach(field => {
                const val = item[field];
                // Check if value is defined and not effectively empty/zero for the purpose of sync
                // If user wants to clear, they must explicitly send a 0 if backend allows it, 
                // but the requirement says blank in app = no write in Excel.
                if (val !== undefined && val !== null && val !== 0) {
                    cleanItem[field] = String(val);
                }
            });

            filteredInventory[key] = cleanItem;
        });

        const response = await fetch(SYSTEM_CONFIG.API_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ user, items: filteredInventory })
        });
        const text = await response.text();
        alert(t.uploadSuccess + " (" + text + ")");
    } catch (e) {
        alert(t.uploadFail + e);
    } finally {
        setIsLoading(false);
    }
  };

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
    setIsSettingsOpen(false);
    alert(t.settings + " Saved");
  };

  return (
    <div className="max-w-3xl mx-auto p-2 pb-10 min-h-screen relative">
      {isLoading && (
        <div className="fixed inset-0 bg-black/85 z-[300] flex flex-col items-center justify-center text-white">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
            <div className="font-bold">{loadingText}</div>
        </div>
      )}

      <div className="relative mb-3 pt-2">
          <h2 className="text-center text-3xl font-bold text-gray-100 tracking-wide mt-2">{t.appTitle}</h2>
          {currentUserEmail && (
              <div className="text-center text-xs text-green-500 font-mono mt-1 opacity-80">
                  Logged in as: {currentUserEmail}
              </div>
          )}
          <button 
               onClick={() => setIsLangModalOpen(true)}
               className="absolute top-1 right-2 w-10 h-10 bg-[#333] border border-gray-600 rounded-full flex items-center justify-center text-xl shadow-lg hover:bg-gray-700 transition-colors z-20"
            >
               ⚙️
           </button>
      </div>

      {isLangModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsLangModalOpen(false)}>
            <div className="bg-[#333] border border-[#555] rounded-xl w-full max-w-xs p-6 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-center mb-4 text-[#17a2b8]">{t.langSelect}</h3>
                <div className="flex flex-col gap-3">
                    <button onClick={() => changeLanguage('zh-TW')} className={`p-3 rounded-lg border ${language === 'zh-TW' ? 'bg-[#007bff] border-[#007bff]' : 'bg-[#222] border-[#555]'} font-bold`}>
                        中文 (繁體)
                    </button>
                    <button onClick={() => changeLanguage('en')} className={`p-3 rounded-lg border ${language === 'en' ? 'bg-[#007bff] border-[#007bff]' : 'bg-[#222] border-[#555]'} font-bold`}>
                        English
                    </button>
                    <button onClick={() => changeLanguage('hi')} className={`p-3 rounded-lg border ${language === 'hi' ? 'bg-[#007bff] border-[#007bff]' : 'bg-[#222] border-[#555]'} font-bold`}>
                        हिन्दी (Hindi)
                    </button>
                </div>
                <button onClick={() => setIsLangModalOpen(false)} className="mt-6 w-full py-2 bg-gray-600 rounded-lg font-bold">
                    {t.cancel}
                </button>
            </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3 bg-[#2c3e50] p-3 rounded-lg border-2 border-[#007bff] shadow-[0_0_10px_rgba(0,123,255,0.2)]">
        <div className="flex items-center gap-2">
            <label className="font-bold text-[#5dade2] whitespace-nowrap text-base w-24">{t.user}:</label>
            <input 
              type="text" 
              value={user} 
              onChange={(e) => setUser(e.target.value)}
              onBlur={(e) => handleUserChange(e.target.value)}
              placeholder="User Code" 
              className="flex-1 min-w-0 p-2 border border-[#555] rounded bg-white text-black text-lg font-bold tracking-wide focus:outline-none"
            />
        </div>
        <div className="flex items-center gap-2 border-t border-gray-600 pt-2">
            <label className="font-bold text-[#f1c40f] whitespace-nowrap text-base w-24">{t.cycleCount}:</label>
            <select 
                value={checkIndex}
                onChange={handleCheckIndexChange}
                className="flex-1 p-2 border border-[#555] rounded bg-[#333] text-white text-base font-bold focus:outline-none focus:border-[#f1c40f]"
            >
                <option value={0}>{t.defaultG}</option>
                <option value={1}>{t.count1}</option>
                <option value={2}>{t.count2}</option>
                <option value={3}>{t.count3}</option>
                <option value={4}>{t.count4}</option>
                <option value={5}>{t.count5}</option>
            </select>
        </div>
      </div>

      <div className="mode-switch">
        <button 
          onClick={() => { setMode('barcode'); setIsScanning(false); }}
          className={`mode-btn ${mode === 'barcode' ? 'active' : ''}`}
        >
          {t.modeBarcode}
          <small>{t.modeBarcodeSub}</small>
        </button>
        <button 
          onClick={() => { setMode('ocr'); setIsScanning(false); }}
          className={`mode-btn ${mode === 'ocr' ? 'active' : ''}`}
        >
          {t.modeOCR}
          <small>{t.modeOCRSub}</small>
        </button>
      </div>

      <Scanner 
        mode={mode} 
        onScan={handleSaveItem} 
        isScanning={isScanning} 
        onToggleScan={setIsScanning}
        language={language}
        minLen={settings.minLen}
        maxLen={settings.maxLen}
        flashOn={flashOn}
      />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <button onClick={handleClear} className="h-12 flex flex-col items-center justify-center rounded-lg bg-[#6c757d] text-white hover:opacity-90 active:scale-95 transition-all shadow-md">
          <div className="flex items-center gap-1"><span className="text-lg">🗑️</span> <span className="font-bold">{t.clear}</span></div>
        </button>

        <button onClick={() => setIsSettingsOpen(true)} className="h-12 flex flex-col items-center justify-center rounded-lg bg-[#17a2b8] text-white hover:opacity-90 active:scale-95 transition-all shadow-md">
          <div className="flex items-center gap-1"><span className="text-lg">⚙️</span> <span className="font-bold">{t.settings}</span></div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <button onClick={handleExport} className="h-12 flex flex-col items-center justify-center rounded-lg bg-[#28a745] text-white hover:opacity-90 active:scale-95 transition-all shadow-md">
          <div className="flex items-center gap-1"><span className="text-lg">📤</span> <span className="font-bold">{t.export}</span></div>
        </button>

        <button onClick={() => window.open(SYSTEM_CONFIG.SHEET_URL, '_blank')} className="h-12 flex flex-col items-center justify-center rounded-lg bg-[#6610f2] text-white hover:opacity-90 active:scale-95 transition-all shadow-md">
            <div className="flex items-center gap-1"><span className="text-lg">📂</span> <span className="font-bold">{t.openSheet}</span></div>
        </button>
      </div>

      <div className="flex mb-3">
         <button onClick={handleUpload} className="flex-1 h-16 flex items-center justify-center gap-2 rounded-lg bg-[#007bff] text-white hover:opacity-90 transition-opacity shadow-md text-lg">
          <span className="text-2xl">☁️</span>
          <span className="font-bold">{t.upload}</span>
        </button>
      </div>

      <InventoryTable 
        inventory={inventory} 
        settings={settings} 
        onEdit={handleSaveItem} 
        onDelete={handleDelete}
        onUpdateField={handleUpdateQty}
        checkIndex={checkIndex}
        language={language}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={saveSettings}
        language={language}
        onLanguageChange={changeLanguage}
      />
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);