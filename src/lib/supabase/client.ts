import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('placeholder.supabase.co') &&
    !key.includes('placeholder')
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (typeof window === 'undefined') {
      // Build-time SSR dummy to allow static route analysis
      return createBrowserClient(
        'https://placeholder.supabase.co',
        'placeholder-anon-key'
      );
    }
    console.error(
      'REGENT Configuration Error: Supabase credentials are not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are set in your environment.'
    );
    return createBrowserClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-anon-key'
    );
  }

  if (client) return client;

  const newClient = createBrowserClient(url, key);

  if (typeof window !== 'undefined') {
    client = newClient;
  }

  return newClient;
}
