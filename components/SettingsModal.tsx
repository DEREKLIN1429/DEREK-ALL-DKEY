import React from 'react';
import { AppSettings, Language } from '../types.ts';
import { SYSTEM_CONFIG, TRANSLATIONS } from '../constants.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, language, onLanguageChange }) => {
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
        
        {/* Language Selection - Dropdown */}
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