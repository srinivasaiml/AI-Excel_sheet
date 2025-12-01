import { Download, CheckCircle, XCircle } from 'lucide-react';
import { ExcelData } from '../types/excel';
import { ExcelGeneratorService } from '../services/excelGenerator';

interface ExcelPreviewProps {
  data: ExcelData;
  onReset: () => void;
}

export function ExcelPreview({ data, onReset }: ExcelPreviewProps) {
  const handleDownload = () => {
    ExcelGeneratorService.downloadCSV(data);
  };

  if (data.status === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-800">Generation Failed</h2>
        </div>
        <p className="text-red-600 mb-6">{data.error}</p>
        <button
          onClick={onReset}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-6xl w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Excel Generated Successfully</h2>
            <p className="text-gray-600">{data.sheet_title}</p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="text-gray-600 hover:text-gray-800 font-medium"
        >
          Create New
        </button>
      </div>

      <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">File Name:</span>
            <span className="ml-2 font-semibold text-gray-800">{data.excel_name}</span>
          </div>
          <div>
            <span className="text-gray-600">Columns:</span>
            <span className="ml-2 font-semibold text-gray-800">{data.columns.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Rows:</span>
            <span className="ml-2 font-semibold text-gray-800">{data.rows.length}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {data.columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.rows.slice(0, 100).map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 last:border-r-0"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.rows.length > 100 && (
        <p className="text-sm text-gray-500 mb-6 text-center">
          Showing 10 of {data.rows.length} rows. Download the file to see all data.
        </p>
      )}

      <button
        onClick={handleDownload}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
      >
        <Download className="w-5 h-5" />
        Download CSV File
      </button>

      <p className="text-xs text-gray-500 mt-4 text-center">
        The file will be downloaded as CSV format, which can be opened in Excel, Google Sheets, and other spreadsheet applications.
      </p>
    </div>
  );
}
