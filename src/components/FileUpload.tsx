import { Upload, AlertCircle } from 'lucide-react';
import { ExcelFile } from '../types/excelData';
import { ExcelParser } from '../services/excelParser';

interface FileUploadProps {
  onFileLoaded: (file: ExcelFile) => void;
}

export function FileUpload({ onFileLoaded }: FileUploadProps) {
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const excelFile = await ExcelParser.parseFile(file);
      onFileLoaded(excelFile);
    } catch (error) {
      // In production, consider using a toast instead of alert
      alert(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-16 px-8 
      rounded-3xl border-2 border-dashed border-white/30 
      bg-white/95 backdrop-blur-xl shadow-2xl
      hover:border-cyan-400/60 transition-all duration-300 hover:shadow-cyan-500/20
      group cursor-pointer"
    >
      <div className="p-4 bg-cyan-500/10 rounded-full group-hover:bg-cyan-500/20 transition-colors">
        <Upload className="w-10 h-10 text-cyan-400" />
      </div>

      <div className="text-center max-w-md">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload Excel File</h3>
        <p className="text-gray-600">
          Drag & drop your <span className="font-medium">.xlsx</span> or <span className="font-medium">.xls</span> file here
        </p>
      </div>

      <label className="mt-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 
        hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-medium 
        transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer">
        Browse Files
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.ods,.xlsm,.xlsb,.xml"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      <div className="flex items-start gap-2 text-sm text-gray-600 
        bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 
        backdrop-blur-sm max-w-md">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Supports .xlsx and .xls files. Your data is processed <span className="font-medium">locally</span> and never leaves your device.
        </p>
      </div>
    </div>
  );
}