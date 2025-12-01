import { ExcelData, ExcelGenerationRequest, ValidationResult } from '../types/excel';

export class ExcelGeneratorService {
  static validateRequest(request: ExcelGenerationRequest): ValidationResult {
    const errors: string[] = [];

    if (request.columnCount <= 0) {
      errors.push('Column count must be greater than 0');
    }

    if (request.rowCount <= 0) {
      errors.push('Row count must be greater than 0');
    }

    if (request.columnNames.length !== request.columnCount) {
      errors.push(`Column names count (${request.columnNames.length}) doesn't match column count (${request.columnCount})`);
    }

    if (request.columnNames.some(name => !name.trim())) {
      errors.push('All column names must be non-empty');
    }

    if (request.rowData && request.rowData.length > 0) {
      const invalidRows = request.rowData.filter(row => row.length !== request.columnCount);
      if (invalidRows.length > 0) {
        errors.push(`Some rows have mismatched column count. Expected ${request.columnCount} columns`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static generateSampleData(
    columnNames: string[],
    rowCount: number,
    taskDescription: string
  ): (string | number)[][] {
    const rows: (string | number)[][] = [];

    for (let i = 0; i < rowCount; i++) {
      const row: (string | number)[] = columnNames.map(colName => {
        const lowerCol = colName.toLowerCase();

        // Sample data logic (Indian context as requested in your prompts)
        if (lowerCol.includes('name')) {
          const names = ['Aarav', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Anjali', 'Rohan', 'Kavya', 'Aditya', 'Mira'];
          return names[i % names.length];
        }

        if (lowerCol.includes('age')) {
          return 20 + (i % 30);
        }

        if (lowerCol.includes('city')) {
          const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur'];
          return cities[i % cities.length];
        }

        if (lowerCol.includes('email')) {
          return `user${i + 1}@example.com`;
        }

        if (lowerCol.includes('phone') || lowerCol.includes('mobile')) {
          return `+91 ${9000000000 + i}`;
        }

        if (lowerCol.includes('salary') || lowerCol.includes('price') || lowerCol.includes('amount')) {
          return 30000 + (i * 5000);
        }

        if (lowerCol.includes('date')) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          return date.toISOString().split('T')[0];
        }

        if (lowerCol.includes('status')) {
          // Simple logic: Alternate statuses or based on row index
          const statuses = ['Active', 'Inactive', 'Pending', 'Completed'];
          return statuses[i % statuses.length];
        }

        if (lowerCol.includes('id') || lowerCol.includes('number') || lowerCol.includes('count')) {
          return i + 1;
        }

        return `Data ${i + 1}`;
      });

      rows.push(row);
    }

    return rows;
  }

  static generateExcelData(request: ExcelGenerationRequest): ExcelData {
    const validation = this.validateRequest(request);

    if (!validation.isValid) {
      return {
        status: 'error',
        excel_name: '',
        sheet_title: '',
        columns: [],
        rows: [],
        error: validation.errors.join('; ')
      };
    }

    let rows = request.rowData || [];

    if (!rows || rows.length === 0 || request.autoFill) {
      rows = this.generateSampleData(
        request.columnNames,
        request.rowCount,
        request.taskDescription
      );
    }

    // --- FIX FOR LONG FILENAMES ---
    // 1. Take only the first 4 words
    const firstFewWords = request.taskDescription.split(' ').slice(0, 4).join('_');
    
    // 2. Clean special characters and ensure it's not empty
    let cleanName = firstFewWords
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '') // Keep only letters, numbers, and underscore
      .replace(/_+/g, '_');        // Merge multiple underscores

    // 3. Hard limit to 25 characters to be safe
    if (cleanName.length > 25) {
      cleanName = cleanName.substring(0, 25);
    }
    
    // 4. Default if empty
    const finalName = cleanName || 'generated_excel';
    // ------------------------------

    // --- FIX FOR SHEET TITLE ---
    // Excel sheet names cannot exceed 31 chars
    const safeSheetTitle = request.taskDescription.slice(0, 30).replace(/[:\/\\?*\[\]]/g, '');

    return {
      status: 'success',
      excel_name: `${finalName}.xlsx`,
      sheet_title: safeSheetTitle,
      columns: request.columnNames,
      rows: rows.slice(0, request.rowCount)
    };
  }

  static exportToCSV(data: ExcelData): string {
    const rows = [
      data.columns.join(','),
      ...data.rows.map(row =>
        row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ];

    return rows.join('\n');
  }

  static downloadCSV(data: ExcelData): void {
    const csv = this.exportToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', data.excel_name.replace('.xlsx', '.csv'));
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}