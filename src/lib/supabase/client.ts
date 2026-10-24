import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Build-time prerender and missing credential resilience
  if (!url || !key) {
    if (typeof window === 'undefined') {
      return createBrowserClient(
        url || 'https://placeholder.supabase.co',
        key || 'placeholder-anon-key'
      );
    }
    console.error(
      'REGENT: Missing Supabase environment variables! Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are set in your deployment environment.'
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
