import React, { useState, useEffect, useCallback } from 'react';
import { InventoryMap, AppSettings, ScanMode, InventoryItem, Language } from './types.ts';
import { DEFAULT_SETTINGS, SYSTEM_CONFIG, TRANSLATIONS } from './constants.ts';
import { Scanner } from './components/Scanner.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { InventoryTable } from './components/InventoryTable.tsx';

const App: React.FC = () => {
  // --- State ---
  const [user, setUser] = useState<string>("Default");
  const [checkIndex, setCheckIndex] = useState<number>(0); // 0 (Default/G), 1-5
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isScanning, setIsScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  
  // Auth State
  // FIX: Default to 'authorized' so the app opens immediately.
  // We treat the app as "Offline First".
  const [authStatus, setAuthStatus] = useState<'pending' | 'authorized' | 'unauthorized'>('authorized');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

  // Language State
  const [language, setLanguage] = useState<Language>('zh-TW');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  // Helper to get text
  const t = TRANSLATIONS[language];

  // --- Initialization & Auth Check ---
  useEffect(() => {
    // 1. Load LocalStorage Data
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

    // 2. Perform Server-Side Auth Check (Non-blocking)
    checkPermission();
  }, []);

  const checkPermission = async () => {
    // We try to fetch user info for display, but we DO NOT block the app if it fails.
    try {
        const response = await fetch(SYSTEM_CONFIG.API_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            // Sending a specific action to the backend to request permission check
            body: JSON.stringify({ action: "checkAuth" })
        });
        
        const text = await response.text();
        try {
            const result = JSON.parse(text);
            // If backend explicitly says false, we could block, but for now we trust the user has the link.
            // We mainly use this to get the email.
            if (result && result.email) setCurrentUserEmail(result.email);
        } catch (e) {
            console.warn("Backend not returning JSON auth info, likely legacy script. Continuing in offline mode.");
        }
    } catch (e) {
        console.warn("Auth check failed (Network), continuing in offline mode.");
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

        const qtyStr = prompt(t.confirmQty, defaultQty);
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
        
        // SORTING: Sort by scanTime descending (Newest first)
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
        const formatVal = (val: number | undefined | null) => {
             if (val === undefined || val === null || val === 0) return "";
             return String(val);
        };
        
        // SORTING: Sort by scanTime descending (Newest first) for Cloud Upload
        const sortedItems = (Object.entries(inventory) as [string, InventoryItem][])
            .sort(([, a], [, b]) => b.scanTime.localeCompare(a.scanTime));

        sortedItems.forEach(([key, item]) => {
            const cleanItem: any = {
                name: item.name,
                location: item.location,
                scanTime: item.scanTime,
                qty: formatVal(item.qty),
                qty1: formatVal(item.qty1),
                qty2: formatVal(item.qty2),
                qty3: formatVal(item.qty3),
                qty4: formatVal(item.qty4),
                qty5: formatVal(item.qty5)
            };
            filteredInventory[key] = cleanItem;
        });

        const response = await fetch(SYSTEM_CONFIG.API_URL, {
            method: 'POST',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ user, items: filteredInventory })
        });
        const text = await response.text();
        alert(t.uploadSuccess + " (" + text + ")");
        localStorage.removeItem('lastLocation');
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

  // 3. Authorized State (Main App) - No longer blocking based on authStatus
  return (
    <div className="max-w-3xl mx-auto p-2 pb-10 min-h-screen relative">
      {/* Loading Overlay (for Uploads) */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/85 z-[300] flex flex-col items-center justify-center text-white">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
            <div className="font-bold">{loadingText}</div>
        </div>
      )}

      {/* Header with Title (Gear Icon Removed) */}
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

      {/* Language Selection Modal */}
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

      {/* User Bar & Check Index Dropdown */}
      <div className="flex flex-col gap-2 mb-3 bg-[#2c3e50] p-3 rounded-lg border-2 border-[#007bff] shadow-[0_0_10px_rgba(0,123,255,0.2)]">
        <div className="flex items-center gap-2">
            <label className="font-bold text-[#5dade2] whitespace-nowrap text-base w-24">{t.user}:</label>
            <input 
              type="text" 
              value={user} 
              onChange={(e) => setUser(e.target.value)}
              onBlur={(e) => handleUserChange(e.target.value)}
              placeholder="User Code" 
              // FIX: added min-w-0 to prevent flex item from overflowing parent
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

      {/* Mode Switch (Updated Classes) */}
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

      {/* Scanner Viewport */}
      <Scanner 
        mode={mode} 
        onScan={handleSaveItem} 
        isScanning={isScanning} 
        onToggleScan={setIsScanning}
        triggerFlash={flashOn}
        language={language}
        minLen={settings.minLen}
        maxLen={settings.maxLen}
      />

      {/* Controls: Row 1 - Clear & Settings */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button onClick={handleClear} className="h-12 flex flex-col items-center justify-center rounded-lg bg-[#6c757d] text-white hover:opacity-90 active:scale-95 transition-all shadow-md">
          <div className="flex items-center gap-1"><span className="text-lg">🗑️</span> <span className="font-bold">{t.clear}</span></div>
        </button>

        <button onClick={() => setIsSettingsOpen(true)} className="h-12 flex flex-col items-center justify-center rounded-lg bg-[#17a2b8] text-white hover:opacity-90 active:scale-95 transition-all shadow-md">
          <div className="flex items-center gap-1"><span className="text-lg">⚙️</span> <span className="font-bold">{t.settings}</span></div>
        </button>
      </div>

      {/* Removed Flash Toggle Button */}

      {/* Controls: Row 3 - Export & Open Sheet (SWAPPED to be together) */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button onClick={handleExport} className="h-12 flex flex-col items-center justify-center rounded-lg bg-[#28a745] text-white hover:opacity-90 active:scale-95 transition-all shadow-md">
          <div className="flex items-center gap-1"><span className="text-lg">📤</span> <span className="font-bold">{t.export}</span></div>
        </button>

        <button onClick={() => window.open(SYSTEM_CONFIG.SHEET_URL, '_blank')} className="h-12 flex flex-col items-center justify-center rounded-lg bg-[#6610f2] text-white hover:opacity-90 active:scale-95 transition-all shadow-md">
            <div className="flex items-center gap-1"><span className="text-lg">📂</span> <span className="font-bold">{t.openSheet}</span></div>
        </button>
      </div>

      {/* Controls: Row 4 - Upload (Moved to Bottom) */}
      <div className="flex mb-3">
         <button onClick={handleUpload} className="flex-1 h-16 flex items-center justify-center gap-2 rounded-lg bg-[#007bff] text-white hover:opacity-90 transition-opacity shadow-md text-lg">
          <span className="text-2xl">☁️</span>
          <span className="font-bold">{t.upload}</span>
        </button>
      </div>

      {/* Inventory Table */}
      <InventoryTable 
        inventory={inventory} 
        settings={settings} 
        onEdit={handleSaveItem} 
        onDelete={handleDelete}
        onUpdateField={handleUpdateQty}
        checkIndex={checkIndex}
        language={language}
      />

      {/* Settings Modal */}
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

export default App;