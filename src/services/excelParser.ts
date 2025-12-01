import * as XLSX from 'xlsx';
import { ExcelFile, ExcelSheet } from '../types/excelData';

export class ExcelParser {
  static parseFile(file: File): Promise<ExcelFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });

          const sheets: ExcelSheet[] = workbook.SheetNames.map((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const headers = (jsonData[0] || []) as string[];
            const rows = (jsonData.slice(1) || []) as (string | number | null)[][];

            return {
              name: sheetName,
              headers: headers.map(h => String(h || '')),
              rows,
            };
          });

          resolve({
            filename: file.name,
            sheets,
            currentSheetIndex: 0,
          });
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  static exportFile(excelFile: ExcelFile): void {
    const workbook = XLSX.utils.book_new();

    excelFile.sheets.forEach((sheet) => {
      const data = [sheet.headers, ...sheet.rows];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    const filename = excelFile.filename || 'export.xlsx';
    XLSX.writeFile(workbook, filename);
  }

  static addColumn(sheet: ExcelSheet, columnName: string, defaultValue: string | number = ''): ExcelSheet {
    return {
      ...sheet,
      headers: [...sheet.headers, columnName],
      rows: sheet.rows.map(row => [...row, defaultValue]),
    };
  }

  static removeColumn(sheet: ExcelSheet, columnIndex: number): ExcelSheet {
    if (columnIndex < 0 || columnIndex >= sheet.headers.length) {
      throw new Error('Invalid column index');
    }

    return {
      ...sheet,
      headers: sheet.headers.filter((_, i) => i !== columnIndex),
      rows: sheet.rows.map(row => row.filter((_, i) => i !== columnIndex)),
    };
  }

  static updateCell(sheet: ExcelSheet, rowIndex: number, colIndex: number, value: string | number): ExcelSheet {
    const newRows = sheet.rows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        const newRow = [...row];
        newRow[colIndex] = value;
        return newRow;
      }
      return row;
    });

    return { ...sheet, rows: newRows };
  }

  static insertRow(sheet: ExcelSheet, rowIndex: number, values: (string | number | null)[] = []): ExcelSheet {
    const newRows = [...sheet.rows];
    const rowToInsert = values.length > 0 ? values : Array(sheet.headers.length).fill('');
    newRows.splice(rowIndex, 0, rowToInsert);

    return { ...sheet, rows: newRows };
  }

  static deleteRow(sheet: ExcelSheet, rowIndex: number): ExcelSheet {
    return {
      ...sheet,
      rows: sheet.rows.filter((_, i) => i !== rowIndex),
    };
  }
}
