import { createClient } from '@supabase/supabase-js'

// ─── Update these two values from Supabase → Settings ────────────────────────
// URL:  Settings → General → Project URL
// KEY:  Settings → API Keys → Publishable key (starts with sb_publishable_...)
const SUPABASE_URL = 'https://xspeaakapbvjwmnsjkgs.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_XF7811UfFiUjXy-3ylGrcg_-jADDxaM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
