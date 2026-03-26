import { supabase } from '../lib/supabase'

export async function generateQuoteNumber() {
  const year = new Date().getFullYear()
  const prefix = `FAB-${year}-`

  const { data, error } = await supabase
    .from('jobs')
    .select('quote_number')
    .like('quote_number', `${prefix}%`)
    .order('quote_number', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching quote numbers:', error)
    return `${prefix}001`
  }

  if (!data || data.length === 0) {
    return `${prefix}001`
  }

  const last = data[0].quote_number
  const lastNum = parseInt(last.replace(prefix, ''), 10)
  const next = lastNum + 1
  return `${prefix}${String(next).padStart(3, '0')}`
}
