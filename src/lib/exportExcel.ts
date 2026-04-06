import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function exportToExcel(transactions: Transaction[], filename: string = 'transacciones') {
  // Transform transactions to Excel format
  const data = transactions.map(t => {
    return {
      Fecha: format(new Date(t.fecha), 'dd/MM/yyyy', { locale: es }),
      Categoría: t.category || '',
      Tipo: t.tipo === 'Ingreso' || t.tipo === 'income' ? 'Ingreso' : 'Gasto',
      Monto: t.monto,
      Nota: t.descripcion || '',
    };
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 20 }, // Categoría
    { wch: 10 }, // Tipo
    { wch: 12 }, // Monto
    { wch: 30 }, // Nota
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');

  // Generate filename with date
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const fullFilename = `${filename}-${dateStr}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, fullFilename);
}
