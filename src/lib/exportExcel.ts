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

export function generateMonthlySummary(transactions: Transaction[]) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.fecha);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalIncome = monthTransactions
    .filter(t => t.tipo === 'Ingreso' || t.tipo === 'income')
    .reduce((sum, t) => sum + t.monto, 0);

  const totalExpenses = monthTransactions
    .filter(t => t.tipo === 'Egreso' || t.tipo === 'expense')
    .reduce((sum, t) => sum + t.monto, 0);

  const expensesByCategory = monthTransactions
    .filter(t => t.tipo === 'Egreso' || t.tipo === 'expense')
    .reduce((acc, t) => {
      const categoryName = t.category || 'Sin categoría';
      acc[categoryName] = (acc[categoryName] || 0) + t.monto;
      return acc;
    }, {} as Record<string, number>);

  return {
    month: format(new Date(), 'MMMM yyyy', { locale: es }),
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    expensesByCategory,
    transactionCount: monthTransactions.length,
  };
}
