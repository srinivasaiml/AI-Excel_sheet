import { useState } from 'react';
import { Trash2, Plus, Download, Loader } from 'lucide-react';
import { ExcelFile, ExcelSheet } from '../types/excelData';
import { ExcelParser } from '../services/excelParser';

interface ExcelEditorProps {
  excelFile: ExcelFile;
  onUpdate: (file: ExcelFile) => void;
  onProcessWithAI: (instruction: string) => Promise<void>;
  isProcessing: boolean;
}

export function ExcelEditor({ excelFile, onUpdate, onProcessWithAI, isProcessing }: ExcelEditorProps) {
  const currentSheet = excelFile.sheets[excelFile.currentSheetIndex];
  const [aiInstruction, setAiInstruction] = useState<string>('');
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);

  // Keep all your handler functions exactly as they are
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const updatedSheet = ExcelParser.updateCell(currentSheet, rowIndex, colIndex, value);
    const updatedSheets = [...excelFile.sheets];
    updatedSheets[excelFile.currentSheetIndex] = updatedSheet;
    onUpdate({ ...excelFile, sheets: updatedSheets });
  };

  const handleAddColumn = () => {
    const newColumnName = `Column ${currentSheet.headers.length + 1}`;
    const updatedSheet = ExcelParser.addColumn(currentSheet, newColumnName);
    const updatedSheets = [...excelFile.sheets];
    updatedSheets[excelFile.currentSheetIndex] = updatedSheet;
    onUpdate({ ...excelFile, sheets: updatedSheets });
  };

  const handleDeleteColumn = (colIndex: number) => {
    if (confirm('Are you sure you want to delete this column?')) {
      const updatedSheet = ExcelParser.removeColumn(currentSheet, colIndex);
      const updatedSheets = [...excelFile.sheets];
      updatedSheets[excelFile.currentSheetIndex] = updatedSheet;
      onUpdate({ ...excelFile, sheets: updatedSheets });
    }
  };

  const handleAddRow = () => {
    const updatedSheet = ExcelParser.insertRow(currentSheet, currentSheet.rows.length);
    const updatedSheets = [...excelFile.sheets];
    updatedSheets[excelFile.currentSheetIndex] = updatedSheet;
    onUpdate({ ...excelFile, sheets: updatedSheets });
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (confirm('Are you sure you want to delete this row?')) {
      const updatedSheet = ExcelParser.deleteRow(currentSheet, rowIndex);
      const updatedSheets = [...excelFile.sheets];
      updatedSheets[excelFile.currentSheetIndex] = updatedSheet;
      onUpdate({ ...excelFile, sheets: updatedSheets });
    }
  };

  const handleExport = () => {
    ExcelParser.exportFile(excelFile);
  };

  const handleUpdateColumnName = (colIndex: number, newName: string) => {
    const updatedHeaders = [...currentSheet.headers];
    updatedHeaders[colIndex] = newName;
    const updatedSheet = { ...currentSheet, headers: updatedHeaders };
    const updatedSheets = [...excelFile.sheets];
    updatedSheets[excelFile.currentSheetIndex] = updatedSheet;
    onUpdate({ ...excelFile, sheets: updatedSheets });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{excelFile.filename}</h2>
          <p className="text-cyan-300/80 text-sm">Sheet: {currentSheet.name}</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600/90 to-cyan-600/90 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl transition-all duration-200 shadow-lg border border-cyan-500/30"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* AI Instruction */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-cyan-200">
          AI Instruction
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            placeholder="e.g., Add a 'Status' column and mark 'Active' where Age > 18"
            rows={3}
            className="flex-1 px-4 py-2.5 bg-black/40 border border-cyan-600/30 rounded-xl text-white placeholder:text-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm"
          />
          <button
            onClick={() => onProcessWithAI(aiInstruction)}
            disabled={isProcessing || !aiInstruction.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-700/80 to-indigo-800/80 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all duration-200 flex items-center gap-2 border border-purple-500/30 min-w-[120px] justify-center"
          >
            {isProcessing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Processing
              </>
            ) : (
              'Apply AI'
            )}
          </button>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-cyan-500/20 overflow-auto max-h-[500px] shadow-2xl shadow-cyan-900/20">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-800/80 backdrop-blur-md z-10">
            <tr>
              <th className="w-12 px-4 py-3 border-b border-cyan-700/40 text-cyan-200 font-medium text-center"></th>
              {currentSheet.headers.map((header, colIndex) => (
               <th
  key={colIndex}
  className={`px-4 py-3 border-b border-cyan-700/40 font-semibold text-left cursor-pointer transition-colors ${
    selectedColumn === colIndex
      ? 'bg-purple-900/40'
      : 'text-cyan-200 hover:bg-cyan-900/20'
  }`}
  onClick={() => setSelectedColumn(selectedColumn === colIndex ? null : colIndex)}
>
  <div className="flex items-center justify-between gap-2">
    <input
      type="text"
      value={header}
      onChange={(e) => handleUpdateColumnName(colIndex, e.target.value)}
      placeholder={`Column ${colIndex + 1}`}
      className="w-full bg-black/30 border border-cyan-700/30 rounded px-2 py-1 text-white font-semibold placeholder:text-cyan-500/70 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-w-0"
      onClick={(e) => e.stopPropagation()}
    />
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleDeleteColumn(colIndex);
      }}
      className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-900/30 transition-colors"
      title="Delete column"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
</th>
              ))}
              <th className="w-12 px-4 py-3 border-b border-cyan-700/40 text-center">
                <button
                  onClick={handleAddColumn}
                  className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-emerald-900/30 transition-colors"
                  title="Add column"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentSheet.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-cyan-800/20 hover:bg-cyan-900/10 transition-colors"
              >
                <td className="w-12 px-4 py-3 text-center text-xs font-medium text-cyan-400/80">
                  {rowIndex + 1}
                </td>
                {currentSheet.headers.map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <input
                      type="text"
                      value={row[colIndex] || ''}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      className="w-full px-3 py-2 bg-black/30 border border-cyan-700/30 rounded-lg text-white placeholder:text-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </td>
                ))}
                <td className="w-12 px-4 py-3 text-center">
                  <button
                    onClick={() => handleDeleteRow(rowIndex)}
                    className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-900/30 transition-colors"
                    title="Delete row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Row Button */}
      <button
        onClick={handleAddRow}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-black/40 hover:bg-black/60 border border-emerald-500/30 rounded-xl text-emerald-300 font-medium transition-colors hover:text-emerald-200"
      >
        <Plus className="w-4 h-4" />
        Add Row
      </button>
    </div>
  );
}