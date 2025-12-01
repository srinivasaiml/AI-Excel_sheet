import { useState } from 'react';
import { FileSpreadsheet, Sparkles, ChevronDown, ChevronUp, Zap, Loader } from 'lucide-react';
import { ExcelGenerationRequest } from '../types/excel';
import { AIService } from '../services/aiService';

interface ExcelFormProps {
  onGenerate: (request: ExcelGenerationRequest) => void;
}

export function ExcelForm({ onGenerate }: ExcelFormProps) {
  const [columnCount, setColumnCount] = useState<number>(3);
  const [rowCount, setRowCount] = useState<number>(5);
  const [columnNames, setColumnNames] = useState<string[]>(['Name', 'Age', 'City']);
  const [taskDescription, setTaskDescription] = useState<string>('User Data Sheet');
  const [autoFill, setAutoFill] = useState<boolean>(true);
  const [rowData, setRowData] = useState<(string | number)[][]>([]);
  const [showRowInput, setShowRowInput] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<string>('');

  // ... (keep all your logic functions exactly as they are — no changes needed)

  const handleColumnCountChange = (count: number) => {
    setColumnCount(count);
    const newColumns = [...columnNames];
    while (newColumns.length < count) {
      newColumns.push(`Column ${newColumns.length + 1}`);
    }
    if (newColumns.length > count) {
      newColumns.splice(count);
    }
    setColumnNames(newColumns);
  };

  const handleColumnNameChange = (index: number, value: string) => {
    const newColumns = [...columnNames];
    newColumns[index] = value;
    setColumnNames(newColumns);
  };

  const handleRowCountChange = (count: number) => {
    setRowCount(count);
    const newRowData = [...rowData];
    while (newRowData.length < count) {
      newRowData.push(Array(columnCount).fill(''));
    }
    if (newRowData.length > count) {
      newRowData.splice(count);
    }
    setRowData(newRowData);
  };

  const handleRowDataChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRowData = [...rowData];
    if (!newRowData[rowIndex]) {
      newRowData[rowIndex] = Array(columnCount).fill('');
    }
    newRowData[rowIndex][colIndex] = value;
    setRowData(newRowData);
  };

  const parseDataFromText = (text: string) => {
    if (!text.trim()) return;
    const lines = text.split('\n').filter(line => line.trim());
    const parsedRows: (string | number)[][] = [];
    lines.forEach(line => {
      let values: string[] = [];
      if (line.includes('\t')) values = line.split('\t');
      else if (line.includes(',')) values = line.split(',').map(v => v.trim());
      else values = line.split(/\s{2,}/).map(v => v.trim());
      values = values.slice(0, columnCount);
      while (values.length < columnCount) values.push('');
      parsedRows.push(values);
    });
    let newRowData = parsedRows.slice(0, rowCount);
    while (newRowData.length < rowCount) newRowData.push(Array(columnCount).fill(''));
    setRowData(newRowData);
    setAutoFill(false);
    setShowRowInput(true);
  };

  const handleProcessWithAI = async () => {
    if (!taskDescription.trim()) return;
    setIsProcessing(true);
    setAiMessage('Processing with AI...');
    try {
      const response = await AIService.processDescription({
        description: taskDescription,
        columnCount,
        columnNames,
      });
      if (response.rows && response.rows.length > 0) {
        let newRowData = response.rows.slice(0, rowCount);
        while (newRowData.length < rowCount) newRowData.push(Array(columnCount).fill(''));
        setRowData(newRowData);
        setAutoFill(false);
        setShowRowInput(true);
        setAiMessage(response.message);
      }
    } catch (error) {
      setAiMessage(`Error: ${error instanceof Error ? error.message : 'Failed to process'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const request: ExcelGenerationRequest = {
      columnCount,
      rowCount,
      columnNames,
      taskDescription,
      autoFill,
      rowData: !autoFill && rowData.length > 0 ? rowData : undefined,
    };
    onGenerate(request);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-900/70 backdrop-blur-2xl rounded-3xl border border-cyan-500/20 p-8 max-w-3xl w-full shadow-2xl shadow-cyan-900/30"
    >
      <div className="flex items-center gap-3 mb-6">
        <FileSpreadsheet className="w-8 h-8 text-cyan-400" />
        <h1 className="text-3xl font-bold text-white">AI Excel Generator</h1>
      </div>

      <p className="text-cyan-100/80 mb-8">
        Describe your sheet, set columns and rows, and let AI generate structured data for you.
      </p>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-cyan-200 mb-2">
              Number of Columns
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={columnCount}
              onChange={(e) => handleColumnCountChange(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-black/40 border border-cyan-600/30 rounded-xl text-white placeholder:text-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-200 mb-2">
              Number of Rows
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-black/40 border border-cyan-600/30 rounded-xl text-white placeholder:text-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-200 mb-2">
            Task Description or Paste Data
          </label>
          <div className="space-y-2">
           <textarea
  value={taskDescription}
  onChange={(e) => setTaskDescription(e.target.value)}
  placeholder={`e.g., User database for login system\n\nOr paste your data using these columns:\n${columnNames.join('\t')}\nJohn\t28\tNew York\nSarah\t34\tLondon`}
  rows={4}
  className="w-full px-4 py-2.5 bg-black/40 border border-cyan-600/30 rounded-xl text-white font-mono text-sm placeholder:text-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
  required
/>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleProcessWithAI}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-purple-700/80 to-indigo-800/80 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all duration-200 border border-purple-500/30"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI Process
                  </>
                )}
              </button>

              {taskDescription.includes('\n') && !isProcessing && (
                <button
                  type="button"
                  onClick={() => parseDataFromText(taskDescription)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-cyan-700/80 to-teal-800/80 hover:from-cyan-600 hover:to-teal-700 text-white rounded-xl font-medium transition-all duration-200 border border-cyan-500/30"
                >
                  <Zap className="w-4 h-4" />
                  Parse Text
                </button>
              )}
            </div>

            {aiMessage && (
              <div
                className={`p-3 rounded-xl text-sm ${
                  aiMessage.startsWith('Error')
                    ? 'bg-red-900/30 border border-red-700/50 text-red-200'
                    : 'bg-blue-900/30 border border-blue-600/50 text-cyan-200'
                }`}
              >
                {aiMessage}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-cyan-200 mb-2">
            Column Names
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {columnNames.map((name, index) => (
              <input
                key={index}
                type="text"
                value={name}
                onChange={(e) => handleColumnNameChange(index, e.target.value)}
                placeholder={`Column ${index + 1}`}
                className="px-4 py-2.5 bg-black/40 border border-cyan-600/30 rounded-xl text-white placeholder:text-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                required
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-emerald-900/20 rounded-xl border border-emerald-700/30">
            <input
              type="checkbox"
              id="autoFill"
              checked={autoFill}
              onChange={(e) => {
                setAutoFill(e.target.checked);
                if (e.target.checked) setShowRowInput(false);
              }}
              className="w-5 h-5 text-emerald-400 focus:ring-emerald-500 border-cyan-600/30 rounded mt-0.5 bg-black"
            />
            <label
              htmlFor="autoFill"
              className="flex items-start gap-2 text-sm font-medium text-cyan-100 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5" />
              <span>Auto-generate realistic data using AI</span>
            </label>
          </div>

          {!autoFill && (
            <button
              type="button"
              onClick={() => setShowRowInput(!showRowInput)}
              className="w-full flex items-center justify-between p-4 bg-black/30 hover:bg-black/50 rounded-xl border border-cyan-600/20 transition-all duration-200 text-cyan-100"
            >
              <span className="text-sm font-medium">
                {showRowInput ? 'Hide' : 'Show'} Row Data Input ({rowData.length}/{rowCount} filled)
              </span>
              {showRowInput ? (
                <ChevronUp className="w-5 h-5 text-cyan-300" />
              ) : (
                <ChevronDown className="w-5 h-5 text-cyan-300" />
              )}
            </button>
          )}
        </div>

        {!autoFill && showRowInput && (
          <div className="space-y-3 p-4 bg-black/30 rounded-xl border border-cyan-600/20 max-h-96 overflow-y-auto">
            <p className="text-sm text-cyan-200/80">Enter data for each row and column:</p>
            <div className="space-y-3">
              {Array.from({ length: rowCount }).map((_, rowIndex) => (
                <div key={rowIndex} className="p-3 bg-black/40 rounded-lg border border-cyan-700/20">
                  <p className="text-xs font-semibold text-cyan-300 mb-2">Row {rowIndex + 1}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {columnNames.map((_, colIndex) => (
                      <input
                        key={`${rowIndex}-${colIndex}`}
                        type="text"
                        value={rowData[rowIndex]?.[colIndex] || ''}
                        onChange={(e) => handleRowDataChange(rowIndex, colIndex, e.target.value)}
                        placeholder={columnNames[colIndex]}
                        className="px-3 py-2 text-sm bg-black/50 border border-cyan-700/30 rounded-lg text-white placeholder:text-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-emerald-600/90 to-cyan-600/90 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/40 border border-cyan-500/30"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Generate Excel File
        </button>
      </div>
    </form>
  );
}