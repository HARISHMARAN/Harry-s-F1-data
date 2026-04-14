export interface DriverPosition {
  position: number;
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  date: string;
  sector_delta?: string;
  pit_status?: string;
}

export interface DashboardSession {
  session_key: string | number;
  session_name: string;
  session_type: string;
  country_name: string;
  location: string;
  circuit_short_name: string;
  date_start: string;
  date_end?: string;
  current_lap: string | number;
  status?: 'LIVE' | 'NO_RACE';
}

export interface MaxStats {
  best_lap: string;
  top_speed: string;
  started: string;
  tyres: string;
}

export interface DashboardData {
  session: DashboardSession;
  leaderboard: DriverPosition[];
  max_stats: MaxStats;
  live_status: 'LIVE' | 'NO_RACE';
  next_session?: DashboardSession | null;
}

export interface SeasonRace {
  round: string;
  raceName: string;
}

export interface ReplaySessionSummary {
  session_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_name: string;
  location: string;
  year: number;
  round: number;
}

export interface ReplayDriver {
  session_key: number;
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  first_name: string;
  last_name: string;
  headshot_url: string;
  country_code: string;
}

export interface ReplayLap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
  compound?: string | null;
  drs_used?: boolean | null;
}

export interface ReplayPositionSample {
  session_key: number;
  driver_number: number;
  position: number;
  date: string;
}

export interface ReplayRaceControlMessage {
  session_key: number;
  date: string;
  category: string;
  flag: string | null;
  message: string;
  lap_number: number | null;
  driver_number: number | null;
}

export interface ReplayLocationSample {
  date: string;
  x: number;
  y: number;
  z: number;
  driver_number: number;
  session_key: number;
}

export interface ReplayTrackPoint {
  x: number;
  y: number;
}

export interface ReplayTrackOutline {
  points: ReplayTrackPoint[];
  source_driver_number: number;
}

export interface ReplayDrsZone {
  start_fraction: number;
  end_fraction: number;
  sample_count: number;
  label?: string;
}

export interface ReplayDataset {
  session: ReplaySessionSummary;
  drivers: ReplayDriver[];
  laps: ReplayLap[];
  positions: ReplayPositionSample[];
  race_control: ReplayRaceControlMessage[];
  track: ReplayTrackOutline;
  drs_zones?: ReplayDrsZone[];
  total_laps: number;
  start_time: string;
  end_time: string;
  warnings?: string[];
}
