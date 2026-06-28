export interface SectorDetail {
  time: string | null;
  value: number | null;
  personal_fastest: boolean;
  overall_fastest: boolean;
  segment_count: number | null;
}

export interface SpeedTrap {
  speed: number | null;
  personal_fastest: boolean;
  overall_fastest: boolean;
}

export interface LiveStint {
  compound: string | null;
  laps: number | null;
  new: boolean | null;
  tyre_age_at_start: number | null;
  tyre_not_changed: boolean;
}

export interface TrackStatus {
  status: string | null;
  message: string | null;
  code?: string | null;
}

export interface DriverPosition {
  position: number;
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  /** Gap to race leader: "LEADER", "+1.234", "+1L" */
  gap_to_leader: string;
  /** Gap to car directly ahead: "+0.346", "+1L", or null for leader */
  interval?: string | null;
  /** Formatted last lap time: "1:22.456" or "--:--.---" */
  last_lap?: string | null;
  /** Current tyre compound: "SOFT", "MEDIUM", "HARD", "INTER", "WET" */
  tyre?: string | null;
  /** Full stint history from live feed */
  stints?: LiveStint[];
  /** Tyre strategy: array of stints e.g. [{ compound, laps }] (legacy/OpenF1) */
  tyre_stints?: { compound: string; laps: number }[];
  /** Number of pit stops */
  pit_stops?: number | null;
  /** Current lap number */
  lap_number?: number | null;
  /** Tyre age in laps on current set */
  tyre_age?: number | null;
  /** Currently in pit lane */
  in_pit?: boolean;
  /** Driver status: OK | RETIRED | STOPPED | OUT */
  driver_status?: string;
  /** Rich sector times from FastF1 live feed */
  sector_details?: (SectorDetail | null)[];
  /** Speed trap values keyed by I1/I2/FL/ST */
  speeds?: Record<string, SpeedTrap>;
  /** Delta to fastest lap in session */
  delta_to_best?: number | null;
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

export interface WeekendSession {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end?: string | null;
}

export interface RaceControlMessage {
  category: string | null;
  flag: string | null;
  message: string;
  lap_number: number | null;
  driver_number?: number | null;
  timestamp?: string | null;
}

export interface WeatherData {
  air_temperature: number | null;
  track_temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  rainfall: number | null;
}

export interface LapCount {
  current: number | null;
  total: number | null;
}

export interface DashboardData {
  session: DashboardSession;
  leaderboard: DriverPosition[];
  max_stats: MaxStats;
  live_status: 'LIVE' | 'NO_RACE';
  next_session?: DashboardSession | null;
  weekend_schedule?: WeekendSession[];
  data_health?: 'healthy' | 'degraded' | 'offline';
  /** True when OpenF1 API is locked during a live session (unauthenticated access gated) */
  api_locked?: boolean;
  track_status?: TrackStatus | null;
  session_remaining?: string | null;
  lap_count?: LapCount | null;
  weather?: WeatherData | null;
  race_control?: RaceControlMessage[];
  warnings?: string[];
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
  date_end: string | null;
  meeting_key: number | null;
  circuit_key: number | null;
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
  position?: number | null;
  lap_duration: number | null;
  duration_sector_1?: number | null;
  duration_sector_2?: number | null;
  duration_sector_3?: number | null;
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

export interface ReplayStint {
  session_key: number;
  driver_number: number;
  stint_number: number | null;
  lap_start: number | null;
  lap_end: number | null;
  compound: string | null;
  tyre_age_at_start: number | null;
}

export interface ReplayPitStop {
  session_key: number;
  driver_number: number;
  pit_in_lap: number;
  pit_out_lap: number;
  compound_in: string | null;
  compound_out: string | null;
}

export interface ReplayWeatherSample {
  session_key: number;
  date: string;
  air_temperature: number | null;
  track_temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  rainfall: number | null;
  wind_direction: number | null;
  wind_speed: number | null;
}

export interface ReplayTeamRadioMessage {
  session_key: number;
  date: string;
  driver_number: number | null;
  recording_url: string | null;
  transcript: string | null;
}

export interface ReplayTyrePerLapSample {
  session_key: number;
  driver_number: number;
  lap_number: number;
  compound: string | null;
}

export interface ReplayStrategyStint {
  compound: string;
  lap_start: number;
  lap_end: number;
  laps: number;
  average_lap_time: number | null;
  degradation: number | null;
}

export interface ReplayStrategySummary {
  session_key: number;
  driver_number: number;
  driver_name: string;
  start_compound: string | null;
  first_stop_lap: number | null;
  total_stops: number;
  compounds_used: string[];
  laps_per_compound: Record<string, number>;
  stints: ReplayStrategyStint[];
  summary: string;
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
  stints: ReplayStint[];
  pit_stops: ReplayPitStop[];
  weather: ReplayWeatherSample[];
  team_radio: ReplayTeamRadioMessage[];
  tyre_per_lap: ReplayTyrePerLapSample[];
  strategy_summaries: ReplayStrategySummary[];
  track: ReplayTrackOutline;
  drs_zones?: ReplayDrsZone[];
  total_laps: number;
  start_time: string;
  end_time: string;
  warnings?: string[];
}
