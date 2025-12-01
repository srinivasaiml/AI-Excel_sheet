export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export interface ExcelFile {
  filename: string;
  sheets: ExcelSheet[];
  currentSheetIndex: number;
}

export interface AIOperation {
  type: 'add_column' | 'fill_column' | 'modify_rows' | 'add_formula';
  description: string;
  columnName?: string;
  formula?: string;
  condition?: string;
}

export interface AIOperationResult {
  success: boolean;
  message: string;
  changes: {
    columnsAdded: string[];
    rowsModified: number;
    valuesUpdated: number;
  };
}
