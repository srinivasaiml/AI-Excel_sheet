export interface ExcelData {
  status: 'success' | 'error';
  excel_name: string;
  sheet_title: string;
  columns: string[];
  rows: (string | number)[][];
  error?: string;
}

export interface ExcelGenerationRequest {
  columnCount: number;
  rowCount: number;
  columnNames: string[];
  rowData?: (string | number)[][];
  taskDescription: string;
  autoFill?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
