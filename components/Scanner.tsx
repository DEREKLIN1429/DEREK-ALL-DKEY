import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ScanMode, Language } from '../types.ts';
import { TRANSLATIONS } from '../constants.ts';

interface ScannerProps {
  mode: ScanMode;
  onScan: (text: string) => void;
  isScanning: boolean;
  onToggleScan: (active: boolean) => void;
  triggerFlash: boolean;
  language: Language;
  minLen: number;
  maxLen: number;
}

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

export const Scanner: React.FC<ScannerProps> = ({ 
  mode, 
  onScan, 
  isScanning, 
  onToggleScan,
  triggerFlash,
  language,
  minLen,
  maxLen
}) => {
  const barcodeScannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const t = TRANSLATIONS[language];
  
  // OCR State
  const [ocrQuality, setOcrQuality] = useState(false);
  const [ocrText, setOcrText] = useState(t.ocrWait);
  const [streamTrack, setStreamTrack] = useState<MediaStreamTrack | null>(null);
  const ocrIntervalRef = useRef<number | null>(null);

  // Barcode State
  const [tempCode, setTempCode] = useState<string | null>(null);

  // Update initial text when mode/language changes
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

  // --- Barcode Logic (Html5Qrcode) ---
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
      
      // Attempt to apply flash if it was already on
      if (triggerFlash) {
          setTimeout(() => {
            try {
                html5QrCode.applyVideoConstraints({
                     advanced: [{ torch: true }]
                }).catch((err: any) => console.warn("Barcode start flash error:", err));
            } catch(e) {}
          }, 500);
      }

    } catch (err) {
      console.error("Error starting barcode scanner", err);
      alert(`Camera failed: ${err}`);
      onToggleScan(false);
    }
  }, [onToggleScan, tempCode, triggerFlash]);

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

  // --- OCR Logic ---
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
        setStreamTrack(track); // This triggers the useEffect below to apply flash
        
        if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);
        ocrIntervalRef.current = window.setInterval(analyzeFrame, 300);
      }
    } catch (err) {
      alert("OCR Camera Error: " + err);
      onToggleScan(false);
    }
  }, [onToggleScan]); // Note: triggerFlash isn't needed here as setStreamTrack triggers the effect

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
        
        // Analyze center strip
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

  // --- Camera Management Effects ---
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

  // Flash Effect - Robust Implementation
  useEffect(() => {
    // OCR Mode Flash
    if (mode === 'ocr' && streamTrack) {
        // Try/Catch block to handle devices that don't report capabilities correctly but support torch
        try {
            streamTrack.applyConstraints({ advanced: [{ torch: triggerFlash }] } as any)
               .catch(err => console.warn("OCR Flash Error (likely unsupported):", err));
        } catch (e) {
            console.warn("OCR Flash Exception:", e);
        }
    }

    // Barcode Mode Flash
    if (mode === 'barcode' && barcodeScannerRef.current) {
         try {
             barcodeScannerRef.current.applyVideoConstraints({
                 advanced: [{ torch: triggerFlash }]
             }).catch((err: any) => console.warn("Barcode Flash Error:", err));
         } catch(e) {
             console.warn("Barcode Flash Exception:", e);
         }
    }
  }, [triggerFlash, streamTrack, mode]);

  // Main interaction handler
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
        {/* --- Barcode Mode Elements --- */}
        {mode === 'barcode' && (
           <>
             {/* Note: reader needs to exist for library, hidden via internal styles if not active, but we use conditional render for React cleaniness. Library usually handles remount fine if stopped. */}
             <div id="reader" style={{display: isScanning ? 'block' : 'none'}}></div>
             <canvas id="qr-canvas" ref={overlayCanvasRef} style={{display: isScanning ? 'block' : 'none'}} />
             <div id="center-guide" className={tempCode ? 'guide-success' : ''} style={{display: isScanning ? 'block' : 'none'}}></div>
             <div id="cam-hint-text" className="camera-hint" style={{display: isScanning ? 'flex' : 'none'}}>
                {tempCode ? `${t.scanDetected}\n${tempCode}\n${t.scanConfirm}` : t.scannerStart}
             </div>
             {/* Start Hint for Barcode when not scanning */}
             {!isScanning && (
                <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', pointerEvents:'none'}}>
                    <div style={{fontSize:'3rem', marginBottom:'10px', opacity:0.8}}>📷</div>
                    <div style={{fontSize:'1.2rem', fontWeight:'bold'}}>{t.scannerStart}</div>
                </div>
             )}
           </>
        )}

        {/* --- OCR Mode Elements --- */}
        {mode === 'ocr' && (
           <>
             <video id="ocr-video" ref={videoRef} autoPlay playsInline style={{display: isScanning ? 'block' : 'none'}} />
             <canvas ref={canvasRef} className="hidden" />
             
             {/* OCR Overlay structure */}
             <div id="ocr-overlay" className="scan-guide-overlay" style={{display: isScanning ? 'block' : 'none'}}>
                <div className={`guide-box ${ocrQuality ? 'ready' : ''} ${!isScanning ? 'paused' : ''}`}>
                   <div className="guide-line"></div>
                   <div className="guide-text">
                      {ocrText === t.ocrProcessing ? t.ocrProcessing : (ocrQuality ? t.ocrReady : t.ocrWait)}
                   </div>
                </div>
             </div>
             
             {/* Start Hint for OCR when not scanning */}
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