import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

describe('REGENT Production QA & Security Verification', () => {

  describe('1. Next.js 16 Route Protection (Proxy Convention)', () => {
    it('src/proxy.ts exists and adheres to Next.js 16 proxy convention', () => {
      assert.ok(fs.existsSync('src/proxy.ts'), 'src/proxy.ts must exist');
      const content = fs.readFileSync('src/proxy.ts', 'utf8');
      assert.ok(
        content.includes('export async function proxy('),
        'proxy.ts must export a function named proxy'
      );
      assert.ok(
        content.includes('export const config'),
        'proxy.ts must export config'
      );
      assert.ok(
        content.includes("matcher: ["),
        'proxy.ts config must contain matcher array'
      );
    });

    it('no conflicting src/middleware.ts exists (prevents build failure)', () => {
      assert.strictEqual(
        fs.existsSync('src/middleware.ts'),
        false,
        'src/middleware.ts must not exist when src/proxy.ts is present'
      );
    });

    it('proxy.ts protects /app routes and handles session cookies', () => {
      const content = fs.readFileSync('src/proxy.ts', 'utf8');
      assert.ok(
        content.includes("protectedPaths = ['/app']"),
        'proxy.ts must declare /app as protected path'
      );
      assert.ok(
        content.includes('supabase.auth.getUser()'),
        'proxy.ts must refresh session using auth.getUser()'
      );
      assert.ok(
        content.includes("url.pathname = '/login'"),
        'proxy.ts must redirect unauthenticated users to /login'
      );
    });
  });

  describe('2. Open-Redirect Prevention', () => {
    it('auth callback route rejects protocol-relative and external redirect targets', () => {
      const content = fs.readFileSync('src/app/auth/callback/route.ts', 'utf8');
      assert.ok(
        content.includes("rawNext.startsWith('/') && !rawNext.startsWith('//')"),
        'Callback route must validate next parameter starts with / and not //'
      );
    });

    it('login page sanitizes redirectedFrom parameter', () => {
      const content = fs.readFileSync('src/app/login/page.tsx', 'utf8');
      assert.ok(
        content.includes("redirectedFrom.startsWith('/') && !redirectedFrom.startsWith('//')"),
        'Login page must validate redirectedFrom parameter starts with / and not //'
      );
    });
  });

  describe('3. Password Reset Flow', () => {
    it('src/app/reset-password/page.tsx exists and matches auth-provider redirect route', () => {
      assert.ok(
        fs.existsSync('src/app/reset-password/page.tsx'),
        'src/app/reset-password/page.tsx must exist'
      );
      const authProvider = fs.readFileSync('src/components/providers/auth-provider.tsx', 'utf8');
      assert.ok(
        authProvider.includes('/reset-password'),
        'auth-provider.tsx must redirect reset email to /reset-password'
      );
    });

    it('reset-password page validates password length and uses supabase.auth.updateUser', () => {
      const content = fs.readFileSync('src/app/reset-password/page.tsx', 'utf8');
      assert.ok(
        content.includes('supabase.auth.updateUser'),
        'reset-password page must call supabase.auth.updateUser'
      );
      assert.ok(
        content.includes('password.length < 8'),
        'reset-password page must enforce minimum password length of 8'
      );
      assert.ok(
        content.includes('password !== confirmPassword'),
        'reset-password page must verify matching passwords'
      );
    });
  });

  describe('4. Onboarding Decision Logic', () => {
    it('AppLayout checks onboarding_completed before rendering dashboard', () => {
      const content = fs.readFileSync('src/app/app/layout.tsx', 'utf8');
      assert.ok(
        content.includes('profile.onboarding_completed === false'),
        'AppLayout must check profile.onboarding_completed === false'
      );
      assert.ok(
        content.includes("router.push('/onboarding')"),
        'AppLayout must push to /onboarding for new un-onboarded users'
      );
    });

    it('onboarding page updates profile and marks onboarding_completed', () => {
      const content = fs.readFileSync('src/app/onboarding/page.tsx', 'utf8');
      assert.ok(
        content.includes('onboarding_completed: true'),
        'onboarding page must save onboarding_completed: true'
      );
      assert.ok(
        content.includes("router.push('/app')"),
        'onboarding page must route to /app upon completion'
      );
    });
  });

  describe('5. Google OAuth Implementation', () => {
    it('AuthProvider exposes signInWithGoogle calling signInWithOAuth with provider google', () => {
      const content = fs.readFileSync('src/components/providers/auth-provider.tsx', 'utf8');
      assert.ok(
        content.includes('signInWithGoogle'),
        'AuthProvider must define and export signInWithGoogle'
      );
      assert.ok(
        content.includes("provider: 'google'"),
        'AuthProvider must pass provider: google to signInWithOAuth'
      );
    });

    it('Login page renders Continue with Google button as sole auth method', () => {
      const content = fs.readFileSync('src/app/login/page.tsx', 'utf8');
      assert.ok(
        content.includes('Continue with Google'),
        'Login page must display Continue with Google button'
      );
      assert.ok(
        content.includes('handleGoogleLogin'),
        'Login page must bind Google button to handleGoogleLogin'
      );
      assert.ok(
        !content.includes('type="password"'),
        'Login page must not contain password input fields'
      );
      assert.ok(
        !content.includes('signInWithPassword'),
        'Login page must not use email/password sign-in'
      );
    });

    it('Signup page renders Continue with Google button as sole auth method', () => {
      const content = fs.readFileSync('src/app/signup/page.tsx', 'utf8');
      assert.ok(
        content.includes('Continue with Google'),
        'Signup page must display Continue with Google button'
      );
      assert.ok(
        content.includes('handleGoogleSignup'),
        'Signup page must bind Google button to handleGoogleSignup'
      );
      assert.ok(
        !content.includes('type="password"'),
        'Signup page must not contain password input fields'
      );
      assert.ok(
        !content.includes('signUpWithEmail'),
        'Signup page must not use email registration form'
      );
    });

    it('OAuth callback route handles code exchange and user provisioning', () => {
      const content = fs.readFileSync('src/app/auth/callback/route.ts', 'utf8');
      assert.ok(
        content.includes('exchangeCodeForSession'),
        'Callback route must exchange code for session'
      );
      assert.ok(
        content.includes("from('profiles')"),
        'Callback route must check or provision profiles table'
      );
      assert.ok(
        content.includes("from('user_preferences')"),
        'Callback route must check or provision user_preferences table'
      );
      assert.ok(
        content.includes('onboarding_completed'),
        'Callback route must check onboarding completion status'
      );
    });
  });

  describe('6. Database Migrations & Security Hardening', () => {
    it('forward migration 003_production_security_and_constraints.sql exists and has catalog checks', () => {
      const fPath = 'supabase/migrations/003_production_security_and_constraints.sql';
      assert.ok(fs.existsSync(fPath), '003 forward migration must exist');
      const content = fs.readFileSync(fPath, 'utf8');
      assert.ok(content.includes('fk_tasks_project'), 'Must validate fk_tasks_project');
      assert.ok(content.includes('fk_tasks_subject'), 'Must validate fk_tasks_subject');
      assert.ok(content.includes("f.relname = 'projects'"), 'Must verify target table is projects');
      assert.ok(content.includes("f.relname = 'subjects'"), 'Must verify target table is subjects');
      assert.ok(content.includes("c.confdeltype = 'n'"), 'Must verify ON DELETE SET NULL');
    });

    it('handle_new_user and update_updated_at_column have safe search_path = public', () => {
      const fPath = 'supabase/migrations/003_production_security_and_constraints.sql';
      const content = fs.readFileSync(fPath, 'utf8');
      const matches = content.match(/SET search_path = public;/g) || [];
      assert.ok(matches.length >= 2, 'Both functions must declare SET search_path = public');
    });

    it('handle_new_user has ON CONFLICT guards for both profiles and user_preferences', () => {
      const fPath = 'supabase/migrations/003_production_security_and_constraints.sql';
      const content = fs.readFileSync(fPath, 'utf8');
      assert.ok(
        content.includes('ON CONFLICT (id) DO NOTHING'),
        'Must contain ON CONFLICT (id) DO NOTHING for profiles'
      );
      assert.ok(
        content.includes('ON CONFLICT (user_id) DO NOTHING'),
        'Must contain ON CONFLICT (user_id) DO NOTHING for user_preferences'
      );
    });

    it('handle_new_user revokes direct EXECUTE from public, anon, authenticated', () => {
      const fPath = 'supabase/migrations/003_production_security_and_constraints.sql';
      const content = fs.readFileSync(fPath, 'utf8');
      assert.ok(
        content.includes('REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;'),
        'Must revoke execute from PUBLIC'
      );
      assert.ok(
        content.includes('REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;'),
        'Must revoke execute from anon'
      );
      assert.ok(
        content.includes('REVOKE EXECUTE ON FUNCTION handle_new_user() FROM authenticated;'),
        'Must revoke execute from authenticated'
      );
    });
  });

});
