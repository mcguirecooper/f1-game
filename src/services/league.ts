import { supabase } from './supabase';
import type { Tables } from './database.types';

export type LiveSeason = Tables<'seasons'>;
export type LiveRace = Tables<'races'>;
export type LiveConstructor = Tables<'constructors'>;
export type LiveDriver = Tables<'drivers'>;
export type LiveStanding = Tables<'standings'>;
export type LivePlayerRaceScore = Tables<'player_race_scores'>;

export interface LiveLeagueData {
  season: LiveSeason;
  races: LiveRace[];
  constructors: LiveConstructor[];
  drivers: LiveDriver[];
  standings: LiveStanding[];
  playerRaceScores: LivePlayerRaceScore[];
}

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

export async function loadLiveLeague(year = 2026): Promise<LiveLeagueData> {
  if (!supabase) throw new Error('Supabase is not configured');

  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('*')
    .eq('year', year)
    .maybeSingle();
  if (seasonError) throw seasonError;
  if (!season) throw new Error(`Season ${year} has not been loaded`);

  const [racesResult, constructorsResult, driversResult, standingsResult, playerScoresResult] = await Promise.all([
    supabase.from('races').select('*').eq('season_id', season.id).order('round_number'),
    supabase.from('constructors').select('*').order('name'),
    supabase.from('drivers').select('*').order('name'),
    supabase.from('standings').select('*').order('points', { ascending: false }),
    supabase.from('player_race_scores').select('*'),
  ]);
  for (const result of [racesResult, constructorsResult, driversResult, standingsResult, playerScoresResult]) {
    if (result.error) throw result.error;
  }

  return {
    season,
    races: racesResult.data ?? [],
    constructors: constructorsResult.data ?? [],
    drivers: driversResult.data ?? [],
    standings: standingsResult.data ?? [],
    playerRaceScores: playerScoresResult.data ?? [],
  };
}
