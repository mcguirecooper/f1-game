import { supabase } from './supabase';

export async function signInWithMagicLink(email: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href,
      shouldCreateUser: false,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
