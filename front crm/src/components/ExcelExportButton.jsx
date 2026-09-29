import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

const ExcelExportButton = ({
  data = [],
  fileName = 'Export_Data',
  sheetName = 'Sheet1',
  title = 'Export Excel',
  className = '',
  size = 'md',
  onExportDone
}) => {
  const handleExport = (e) => {
    if (e) e.preventDefault();
    if (!Array.isArray(data) || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    const success = exportToExcel(data, fileName, sheetName);
    if (success && onExportDone) {
      onExportDone();
    }
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleExport}
      className={`py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98 shrink-0 ${className}`}
      title={`Export ${data ? data.length : 0} records to Excel (.xlsx)`}
    >
      <FileSpreadsheet size={isSmall ? 13 : 14} />
      <span>{title}</span>
    </button>
  );
};

export default ExcelExportButton;
