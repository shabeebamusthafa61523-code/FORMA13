import * as XLSX from 'xlsx';

/**
 * Export array of objects to Excel .xlsx file
 * @param {Array<Object>} data - Array of objects representing rows
 * @param {string} fileName - Target filename prefix
 * @param {string} sheetName - Excel worksheet name
 */
export const exportToExcel = (data, fileName = 'Export_Data', sheetName = 'Sheet1') => {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('No data available for Excel export.');
    return false;
  }

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    const cleanSheetName = (sheetName || 'Data').replace(/[\\/?*:[\]]/g, '').slice(0, 31);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

    const dateStr = new Date().toISOString().split('T')[0];
    const cleanFileName = (fileName || 'Export').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fullFileName = `${cleanFileName}_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fullFileName);
    return true;
  } catch (err) {
    console.error('Excel Export Error:', err);
    return false;
  }
};
