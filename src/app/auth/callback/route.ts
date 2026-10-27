import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');
  const safeNext = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/app';

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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const userMeta = user.user_metadata;
        const displayName =
          userMeta?.full_name ||
          userMeta?.name ||
          userMeta?.display_name ||
          user.email?.split('@')[0] ||
          'Member';
        const avatarUrl = userMeta?.avatar_url || userMeta?.picture || null;

        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          // Provision profile for new Google user
          await supabase.from('profiles').upsert(
            {
              id: user.id,
              email: user.email || '',
              display_name: displayName,
              avatar_url: avatarUrl,
              onboarding_completed: false,
            },
            { onConflict: 'id' }
          );

          await supabase.from('user_preferences').upsert(
            { user_id: user.id },
            { onConflict: 'user_id' }
          );

          // Route new users to onboarding if destination was default /app
          const destination = safeNext === '/app' ? '/onboarding' : safeNext;
          return NextResponse.redirect(`${origin}${destination}`);
        } else {
          // Sync avatar if missing
          if (avatarUrl) {
            await supabase
              .from('profiles')
              .update({ avatar_url: avatarUrl })
              .eq('id', user.id);
          }

          if (profile.onboarding_completed === false && safeNext === '/app') {
            return NextResponse.redirect(`${origin}/onboarding`);
          }

          return NextResponse.redirect(`${origin}${safeNext}`);
        }
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
