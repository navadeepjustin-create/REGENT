import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeRedirectPath } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorDescription = searchParams.get('error_description') || searchParams.get('error');
  const rawNext = searchParams.get('next');
  const targetPath = sanitizeRedirectPath(rawNext, '/app');

  if (errorDescription) {
    console.error('REGENT OAuth callback error:', errorDescription);
    const redirectUrl = new URL('/login', origin);
    redirectUrl.searchParams.set('error', encodeURIComponent(errorDescription));
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.redirect(`${origin}/login?error=missing_credentials`);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      url,
      key,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in server component context
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Safely ensure profile is created or updated
      try {
        const user = data.user;
        const meta = user.user_metadata || {};
        const displayName = meta.display_name || meta.full_name || meta.name || user.email?.split('@')[0] || 'Member';
        const avatarUrl = meta.avatar_url || meta.picture || null;

        await supabase.from('profiles').upsert(
          {
            id: user.id,
            email: user.email || '',
            display_name: displayName,
            avatar_url: avatarUrl,
          },
          { onConflict: 'id' }
        );

        await supabase.from('user_preferences').upsert(
          { user_id: user.id },
          { onConflict: 'user_id' }
        );
      } catch (syncErr) {
        console.warn('OAuth post-auth profile sync note:', syncErr);
      }

      return NextResponse.redirect(`${origin}${targetPath}`);
    } else if (error) {
      console.error('Auth code exchange error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
