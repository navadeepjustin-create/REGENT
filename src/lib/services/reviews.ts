import { createClient } from '@/lib/supabase/client';
import type { DailyReview } from '@/types';

export async function getDailyReview(userId: string, date: string): Promise<DailyReview | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('daily_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    console.error('Error fetching daily review:', error);
    return null;
  }
  return data as DailyReview | null;
}

export async function saveDailyReview(
  userId: string,
  date: string,
  review: Partial<DailyReview>
): Promise<DailyReview> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('daily_reviews')
    .upsert(
      {
        user_id: userId,
        date,
        reflection: review.reflection || null,
        mood: review.mood || null,
        energy: review.energy || null,
        accomplishments: review.accomplishments || [],
        tomorrow_priorities: review.tomorrow_priorities || [],
      },
      {
        onConflict: 'user_id,date',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error saving daily review:', error);
    throw error;
  }
  return data as DailyReview;
}

export async function getReviewsRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyReview[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('daily_reviews')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching reviews range:', error);
    throw error;
  }
  return (data || []) as DailyReview[];
}
