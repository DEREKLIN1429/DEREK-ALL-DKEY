import React from 'react';
import { InventoryMap, AppSettings, InventoryItem, Language } from '../types.ts';
import { TRANSLATIONS } from '../constants.ts';

interface InventoryTableProps {
  inventory: InventoryMap;
  settings: AppSettings;
  onEdit: (code: string) => void;
  onDelete: (code: string) => void;
  onUpdateField: (code: string, field: keyof InventoryItem) => void;
  checkIndex: number;
  language: Language;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ inventory, settings, onEdit, onDelete, onUpdateField, checkIndex, language }) => {
  const items = (Object.entries(inventory) as [string, InventoryItem][]).reverse();
  const t = TRANSLATIONS[language];

  // Helper to render a clickable quantity cell
  const renderQtyCell = (code: string, val: number | undefined, field: keyof InventoryItem, isCurrentMode: boolean) => {
      const hasValue = val !== undefined && val !== 0;
      const displayVal = hasValue ? val?.toFixed(settings.decimals) : '-';
      
      return (
          <td 
            className={`px-2 py-1 text-center font-bold text-base cursor-pointer hover:bg-blue-100 transition-colors ${isCurrentMode ? (hasValue ? 'text-green-600' : 'text-gray-300') : 'text-gray-400'}`}
            onClick={(e) => {
                e.stopPropagation();
                // Always allow clicking to edit/add, not just if hasValue
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
              
              {/* Individual columns for all Qty fields */}
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
                  
                  {/* Clickable Cells for All Qty Fields */}
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