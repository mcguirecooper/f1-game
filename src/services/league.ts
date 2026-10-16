import { supabase } from './supabase';

export async function submitPick(raceId: number, constructorId: number) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('submit_pick', {
    p_race_id: raceId,
    p_constructor_id: constructorId,
  });
  if (error) throw error;
  return data;
}

export async function loadStandings() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('standings').select('*').order('points', { ascending: false });
  if (error) throw error;
  return data;
}

export async function loadSeasonSchedule(seasonId: number) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('races').select('*').eq('season_id', seasonId).order('round_number');
  if (error) throw error;
  return data;
}
