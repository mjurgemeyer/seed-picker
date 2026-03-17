import { createClient } from '@supabase/supabase-js'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Server-side / API routes client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client-side browser client (handles session cookies)
export const createBrowserClient = () => createPagesBrowserClient()

// Admin client — only used in API routes with service role key
export const createAdminClient = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
