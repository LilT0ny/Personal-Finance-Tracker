import * as XLSX from 'xlsx';
import { Transaction, getCategoryConfig } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function exportToExcel(transactions: Transaction[], filename: string = 'transacciones') {
  // Transform transactions to Excel format
  const data = transactions.map(t => {
    const category = getCategoryConfig(t.category);
    return {
      Fecha: format(new Date(t.created_at), 'dd/MM/yyyy', { locale: es }),
      Categoría: category.label,
      Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
      Monto: t.amount,
      Nota: t.note || '',
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
    const date = new Date(t.created_at);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const expensesByCategory = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const category = getCategoryConfig(t.category);
      acc[category.label] = (acc[category.label] || 0) + t.amount;
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
