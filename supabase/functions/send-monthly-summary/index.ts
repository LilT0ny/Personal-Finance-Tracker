// supabase/functions/send-monthly-summary/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface Transaction {
  id: string
  user_id: string
  amount: number
  category: string
  type: 'income' | 'expense'
  note?: string
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Comida',
  transport: 'Transporte',
  health: 'Salud',
  entertainment: 'Entretenimiento',
  shopping: 'Compras',
  utilities: 'Servicios',
  savings: 'Ahorros',
  other: 'Otros',
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#f97316',
  transport: '#3b82f6',
  health: '#ef4444',
  entertainment: '#a855f7',
  shopping: '#ec4899',
  utilities: '#eab308',
  savings: '#22c55e',
  other: '#6b7280',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')

    if (usersError) throw usersError

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const results = []

    for (const user of users || []) {
      if (!user.email) continue

      // Get user's transactions for this month
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())

      if (txError) {
        console.error(`Error fetching transactions for user ${user.id}:`, txError)
        continue
      }

      const income = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0

      const expenses = transactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0

      // Group expenses by category
      const expensesByCategory = transactions
        ?.filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
          return acc
        }, {} as Record<string, number>) || {}

      // Build category breakdown HTML
      const categoryBreakdown = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amount]) => {
          const label = CATEGORY_LABELS[cat] || cat
          const color = CATEGORY_COLORS[cat] || '#6b7280'
          const percentage = ((amount / expenses) * 100).toFixed(1)
          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #2a2a2a;">
                <span style="display: inline-block; width: 12px; height: 12px; background: ${color}; border-radius: 50%; margin-right: 8px;"></span>
                ${label}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #2a2a2a; text-align: right;">$${amount.toFixed(2)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #2a2a2a; text-align: right; color: #6b7280;">${percentage}%</td>
            </tr>
          `
        }).join('')

      // Build email HTML
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #fff; padding: 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; padding: 24px;">
            <h1 style="margin: 0 0 16px 0; font-size: 24px;">📊 Resumen Mensual</h1>
            <p style="color: #a0a0a0; margin: 0 0 24px 0;">Hola, aquí está tu resumen financiero de ${startOfMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <div style="background: #22c55e20; padding: 16px; border-radius: 12px;">
                <p style="margin: 0; color: #22c55e; font-size: 14px;">Ingresos</p>
                <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold; color: #22c55e;">$${income.toFixed(2)}</p>
              </div>
              <div style="background: #ef444420; padding: 16px; border-radius: 12px;">
                <p style="margin: 0; color: #ef4444; font-size: 14px;">Gastos</p>
                <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold; color: #ef4444;">$${expenses.toFixed(2)}</p>
              </div>
            </div>
            
            <div style="background: ${income - expenses >= 0 ? '#22c55e20' : '#ef444420'}; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
              <p style="margin: 0; color: #a0a0a0; font-size: 14px;">Balance</p>
              <p style="margin: 4px 0 0 0; font-size: 32px; font-weight: bold; color: ${income - expenses >= 0 ? '#22c55e' : '#ef4444'};">
                ${income - expenses >= 0 ? '+' : '-'}$${Math.abs(income - expenses).toFixed(2)}
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
                ${categoryBreakdown || '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #6b7280;">No hay gastos registrados</td></tr>'}
              </tbody>
            </table>

            <p style="color: #6b7280; font-size: 12px; margin: 24px 0 0 0;">
              Enviado por Finance Tracker • <a href="#" style="color: #6366f1;">Configurar</a>
            </p>
          </div>
        </body>
        </html>
      `

      // Send email via Resend
      if (RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Finance Tracker <onboarding@resend.dev>',
            to: user.email,
            subject: `📊 Resumen Mensual - ${startOfMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
            html: emailHtml,
          }),
        })

        if (response.ok) {
          results.push({ user: user.email, status: 'sent' })
        } else {
          results.push({ user: user.email, status: 'error', error: await response.text() })
        }
      } else {
        // Just log the email content if no Resend API key
        console.log(`Email for ${user.email}:`, emailHtml)
        results.push({ user: user.email, status: 'logged (no Resend key)' })
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
