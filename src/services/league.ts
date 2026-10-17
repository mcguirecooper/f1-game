import { supabase } from './supabase';
import type { Tables } from './database.types';

export type LiveSeason = Tables<'seasons'>;
export type LiveRace = Tables<'races'>;
export type LiveConstructor = Tables<'constructors'>;
export type LiveDriver = Tables<'drivers'>;
export type LiveStanding = Tables<'standings'>;
export type LivePlayerRaceScore = Tables<'player_race_scores'>;
export type LiveProfile = Tables<'profiles'>;
export type LiveAssignment = Tables<'constructor_assignments'>;
export type LiveDriverResult = Tables<'driver_results'>;
export type LiveAuditLog = Tables<'admin_audit_log'>;

export interface LiveLeagueData {
  season: LiveSeason;
  races: LiveRace[];
  constructors: LiveConstructor[];
  drivers: LiveDriver[];
  standings: LiveStanding[];
  playerRaceScores: LivePlayerRaceScore[];
  profiles: LiveProfile[];
  assignments: LiveAssignment[];
  driverResults: LiveDriverResult[];
  auditLog: LiveAuditLog[];
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

export async function adminUpdateResult(raceId: number, driverId: number, position: number | null, status: string, reason: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('admin_update_result', {
    p_race_id: raceId,
    p_driver_id: driverId,
    p_finishing_position: position as number,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function adminOverridePick(playerId: string, raceId: number, constructorId: number, reason: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('admin_override_pick', {
    p_player_id: playerId,
    p_race_id: raceId,
    p_constructor_id: constructorId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function adminProvisionProfile(userId: string, displayName: string, role: string, reason: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('admin_provision_profile', {
    p_user_id: userId,
    p_display_name: displayName,
    p_role: role,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function loadAdminAuditLog() {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
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

  const [racesResult, constructorsResult, driversResult, standingsResult, playerScoresResult, profilesResult, assignmentsResult, driverResultsResult] = await Promise.all([
    supabase.from('races').select('*').eq('season_id', season.id).order('round_number'),
    supabase.from('constructors').select('*').order('name'),
    supabase.from('drivers').select('*').order('name'),
    supabase.from('standings').select('*').order('points', { ascending: false }),
    supabase.from('player_race_scores').select('*'),
    supabase.from('profiles').select('*').order('display_name'),
    supabase.from('constructor_assignments').select('*'),
    supabase.from('driver_results').select('*'),
  ]);
  for (const result of [racesResult, constructorsResult, driversResult, standingsResult, playerScoresResult, profilesResult, assignmentsResult, driverResultsResult]) {
    if (result.error) throw result.error;
  }

  return {
    season,
    races: racesResult.data ?? [],
    constructors: constructorsResult.data ?? [],
    drivers: driversResult.data ?? [],
    standings: standingsResult.data ?? [],
    playerRaceScores: playerScoresResult.data ?? [],
    profiles: profilesResult.data ?? [],
    assignments: assignmentsResult.data ?? [],
    driverResults: driverResultsResult.data ?? [],
    auditLog: [],
  };
}
