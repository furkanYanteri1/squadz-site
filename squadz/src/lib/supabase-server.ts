import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Phase 1 için auth yok, cookie fonksiyonları şimdilik boş bırakılabilir
export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
        getAll: () => [],
      },
    }
  )
}