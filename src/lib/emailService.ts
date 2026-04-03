import emailjs from '@emailjs/browser';
import { Transaction, getCategoryConfig } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// EmailJS credentials from environment variables
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  expensesByCategory: Record<string, number>;
  transactionCount: number;
  month: string;
}

export function generateMonthlySummary(transactions: Transaction[]): MonthlySummary {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const monthTransactions = transactions.filter(t => 
    new Date(t.created_at) >= startOfMonth
  );

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
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    expensesByCategory,
    transactionCount: monthTransactions.length,
    month: format(now, 'MMMM yyyy', { locale: es }),
  };
}

export function buildEmailHtml(summary: MonthlySummary): string {
  const categoryRows = Object.entries(summary.expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => {
      const percentage = ((amount / summary.totalExpenses) * 100).toFixed(1);
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a2a;">${category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a2a; text-align: right;">$${amount.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a2a; text-align: right; color: #6b7280;">${percentage}%</td>
        </tr>
      `;
    }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #fff; padding: 20px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; padding: 24px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px;">📊 Resumen Mensual</h1>
        <p style="color: #a0a0a0; margin: 0 0 24px 0;">Aquí está tu resumen de ${summary.month}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div style="background: #22c55e20; padding: 16px; border-radius: 12px;">
            <p style="margin: 0; color: #22c55e; font-size: 14px;">Ingresos</p>
            <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold; color: #22c55e;">$${summary.totalIncome.toFixed(2)}</p>
          </div>
          <div style="background: #ef444420; padding: 16px; border-radius: 12px;">
            <p style="margin: 0; color: #ef4444; font-size: 14px;">Gastos</p>
            <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold; color: #ef4444;">$${summary.totalExpenses.toFixed(2)}</p>
          </div>
        </div>
        
        <div style="background: ${summary.balance >= 0 ? '#22c55e20' : '#ef444420'}; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
          <p style="margin: 0; color: #a0a0a0; font-size: 14px;">Balance</p>
          <p style="margin: 4px 0 0 0; font-size: 32px; font-weight: bold; color: ${summary.balance >= 0 ? '#22c55e' : '#ef4444'};">
            ${summary.balance >= 0 ? '+' : '-'}$${Math.abs(summary.balance).toFixed(2)}
          </p>
        </div>

        <h2 style="font-size: 18px; margin: 0 0 16px 0;">Gastos por Categoría</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #2a2a2a; color: #a0a0a0;">Categoría</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #2a2a2a; color: #a0a0a0;">Monto</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #2a2a2a; color: #a0a0a0;">%</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows || '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #6b7280;">No hay gastos registrados</td></tr>'}
          </tbody>
        </table>

        <p style="color: #6b7280; font-size: 12px; margin: 24px 0 0 0;">
          Enviado por Finance Tracker
        </p>
      </div>
    </body>
    </html>
  `;
}

export async function sendMonthlySummary(
  transactions: Transaction[], 
  userEmail: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<boolean> {
  try {
    // Check if EmailJS is configured
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      throw new Error('EmailJS no está configurado. Agrega las variables en .env');
    }

    const summary = generateMonthlySummary(transactions);
    const emailHtml = buildEmailHtml(summary);

    // Initialize EmailJS
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // Send email
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: userEmail,
        subject: `📊 Resumen Mensual - ${summary.month}`,
        html_content: emailHtml,
      }
    );

    if (onSuccess) onSuccess();
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    if (onError) onError(error as Error);
    return false;
  }
}
