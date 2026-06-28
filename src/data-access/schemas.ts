import { z } from 'zod';

const sectorSchema = z.object({
  time: z.string().nullable().optional(),
  value: z.number().nullable().optional(),
  personal_fastest: z.boolean().optional(),
  overall_fastest: z.boolean().optional(),
  segment_count: z.number().nullable().optional(),
}).nullable();

const speedTrapSchema = z.object({
  speed: z.number().nullable().optional(),
  personal_fastest: z.boolean().optional(),
  overall_fastest: z.boolean().optional(),
});

const liveStintSchema = z.object({
  compound: z.string().nullable().optional(),
  laps: z.number().nullable().optional(),
  new: z.boolean().nullable().optional(),
  tyre_age_at_start: z.number().nullable().optional(),
  tyre_not_changed: z.boolean().optional(),
});

export const telemetryDriverSchema = z.object({
  code: z.string().default(''),
  name: z.string().default('Unknown Driver'),
  team: z.string().default('Unknown Team'),
  color: z.string().default('AAAAAA'),
  position: z.number().nullable().optional(),
  lap: z.number().nullable().optional(),
  lapTime: z.number().nullable().optional(),
  lapTimeDisplay: z.string().nullable().optional(),
  bestLapTime: z.number().nullable().optional(),
  bestLapTimeDisplay: z.string().nullable().optional(),
  deltaToBest: z.number().nullable().optional(),
  /** Formatted gap to leader string: "LEADER", "+1.234", "+1L" */
  gapToLeader: z.string().nullable().optional(),
  /** Formatted gap to car directly ahead */
  intervalGap: z.string().nullable().optional(),
  compound: z.string().nullable().optional(),
  /** Legacy tuple format (OpenF1 path) */
  sectors: z.union([
    z.tuple([z.number().nullable(), z.number().nullable(), z.number().nullable()]),
    z.array(sectorSchema),
  ]).optional(),
  /** Rich sector objects from FastF1 path */
  sectorDetails: z.array(sectorSchema).optional(),
  speeds: z.record(z.string(), speedTrapSchema).optional(),
  stints: z.array(liveStintSchema).optional(),
  stint: z.number().nullable().optional(),
  tyreAge: z.number().nullable().optional(),
  pitStops: z.number().nullable().optional(),
  inPit: z.boolean().optional(),
  status: z.string().optional(),
  driverNumber: z.number().optional(),
});

export const telemetryResponseSchema = z.object({
  session: z.string().default('no-live-session'),
  session_name: z.string().optional(),
  session_type: z.string().optional(),
  country_name: z.string().optional(),
  location: z.string().optional(),
  circuit_short_name: z.string().optional(),
  timestamp: z.number().default(() => Math.floor(Date.now() / 1000)),
  status: z.enum(['live', 'no_live']).optional(),
  drivers: z.array(telemetryDriverSchema).default([]),
  next_session: z
    .object({
      session_key: z.union([z.number(), z.string()]),
      session_name: z.string().default('Next Race'),
      session_type: z.string().nullable().optional(),
      country_name: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      circuit_short_name: z.string().nullable().optional(),
      date_start: z.string().nullable().optional(),
      date_end: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  weekend_schedule: z.array(
    z.object({
      session_key: z.number(),
      session_name: z.string(),
      session_type: z.string(),
      date_start: z.string(),
      date_end: z.string().nullable().optional(),
    })
  ).optional(),
  track_status: z.object({
    status: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
  }).nullable().optional(),
  session_remaining: z.string().nullable().optional(),
  lap_count: z.object({
    current: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
  }).nullable().optional(),
  weather: z.object({
    air_temperature: z.union([z.number(), z.string()]).nullable().optional(),
    track_temperature: z.union([z.number(), z.string()]).nullable().optional(),
    humidity: z.union([z.number(), z.string()]).nullable().optional(),
    pressure: z.union([z.number(), z.string()]).nullable().optional(),
    wind_speed: z.union([z.number(), z.string()]).nullable().optional(),
    wind_direction: z.union([z.number(), z.string()]).nullable().optional(),
    rainfall: z.union([z.number(), z.string()]).nullable().optional(),
  }).nullable().optional(),
  race_control: z.array(z.object({
    category: z.string().nullable().optional(),
    flag: z.string().nullable().optional(),
    message: z.string().default(''),
    lap_number: z.number().nullable().optional(),
    driver_number: z.number().nullable().optional(),
    timestamp: z.string().nullable().optional(),
  })).optional(),
  telemetry_intelligence: z.object({
    session_name: z.string().optional(),
    session_type: z.string().optional(),
    status: z.enum(['live', 'no_live']).optional(),
    generated_at: z.string().optional(),
    weather: z.object({
      air_temperature: z.number().nullable().optional(),
      track_temperature: z.number().nullable().optional(),
      humidity: z.number().nullable().optional(),
      rainfall: z.number().nullable().optional(),
      wind_speed: z.number().nullable().optional(),
      pressure: z.number().nullable().optional(),
    }).nullable().optional(),
    drivers: z.array(z.object({
      driver_number: z.number(),
      code: z.string(),
      name: z.string(),
      team: z.string(),
      position: z.number().nullable().optional(),
      current_lap: z.number().nullable().optional(),
      compound: z.string().nullable().optional(),
      tyre_age_laps: z.number().nullable().optional(),
      stint_number: z.number().nullable().optional(),
      pit_stops: z.number().optional(),
      last_lap_time: z.number().nullable().optional(),
      top_speed: z.number().nullable().optional(),
      elimination_status: z.string().optional(),
      battery_status: z.string().optional(),
      sectors: z.array(sectorSchema).optional(),
      speeds: z.record(z.string(), speedTrapSchema).optional(),
      stints: z.array(liveStintSchema).optional(),
      best_lap_time: z.number().nullable().optional(),
    })).optional(),
    race_control: z.array(z.object({
      category: z.string().nullable().optional(),
      flag: z.string().nullable().optional(),
      message: z.string().default(''),
      lap_number: z.number().nullable().optional(),
    })).optional(),
    eliminations: z.object({
      drivers: z.array(z.string()),
      teams: z.array(z.string()),
      note: z.string(),
    }).optional(),
    battery: z.object({
      available: z.boolean(),
      note: z.string(),
    }).optional(),
    track_status: z.string().optional(),
    track_status_flag: z.string().nullable().optional(),
    session_remaining: z.string().nullable().optional(),
    lap_count: z.object({
      current: z.number().nullable().optional(),
      total: z.number().nullable().optional(),
    }).nullable().optional(),
    data_notes: z.array(z.string()).optional(),
  }).optional(),
  warnings: z.array(z.string()).optional(),
});

export const replaySessionSummarySchema = z.object({
  session_key: z.number(),
  session_type: z.string().default('Race'),
  session_name: z.string().default('Race'),
  date_start: z.string(),
  date_end: z.string().nullable().optional().default(''),
  meeting_key: z.number().nullable().optional().default(0),
  circuit_key: z.number().nullable().optional().default(0),
  circuit_short_name: z.string().default(''),
  country_name: z.string().default(''),
  location: z.string().default(''),
  year: z.number(),
  round: z.number(),
});

export const replaySessionsSchema = z.array(replaySessionSummarySchema);

const replayTrackPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const replayLapSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  lap_number: z.number(),
  date_start: z.string().nullable().optional().transform((value) => value ?? ''),
  position: z.number().nullable().optional(),
  lap_duration: z.number().nullable(),
  duration_sector_1: z.number().nullable().optional(),
  duration_sector_2: z.number().nullable().optional(),
  duration_sector_3: z.number().nullable().optional(),
  is_pit_out_lap: z.boolean().default(false),
  compound: z.string().nullable().optional(),
  drs_used: z.boolean().nullable().optional(),
});

const replayDriverSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  broadcast_name: z.string().default(''),
  full_name: z.string().default(''),
  name_acronym: z.string().default(''),
  team_name: z.string().default('Unknown'),
  team_colour: z.string().default('AAAAAA'),
  first_name: z.string().default(''),
  last_name: z.string().default(''),
  headshot_url: z.string().default(''),
  country_code: z.string().default(''),
});

const replayPositionSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  position: z.number(),
  date: z.string(),
});

const replayRaceControlSchema = z.object({
  session_key: z.number(),
  date: z.string(),
  category: z.string().default('INFO'),
  flag: z.string().nullable().optional(),
  message: z.string().default(''),
  lap_number: z.number().nullable().optional(),
  driver_number: z.number().nullable().optional(),
});

const replayStintSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  stint_number: z.number().nullable(),
  lap_start: z.number().nullable(),
  lap_end: z.number().nullable(),
  compound: z.string().nullable(),
  tyre_age_at_start: z.number().nullable(),
});

const replayPitStopSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  pit_in_lap: z.number(),
  pit_out_lap: z.number(),
  compound_in: z.string().nullable(),
  compound_out: z.string().nullable(),
});

const replayWeatherSchema = z.object({
  session_key: z.number(),
  date: z.string(),
  air_temperature: z.number().nullable(),
  track_temperature: z.number().nullable(),
  humidity: z.number().nullable(),
  pressure: z.number().nullable(),
  rainfall: z.number().nullable(),
  wind_direction: z.number().nullable(),
  wind_speed: z.number().nullable(),
});

const replayTeamRadioSchema = z.object({
  session_key: z.number(),
  date: z.string(),
  driver_number: z.number().nullable(),
  recording_url: z.string().nullable(),
  transcript: z.string().nullable(),
});

const replayTyrePerLapSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  lap_number: z.number(),
  compound: z.string().nullable(),
});

const replayStrategyStintSchema = z.object({
  compound: z.string(),
  lap_start: z.number(),
  lap_end: z.number(),
  laps: z.number(),
  average_lap_time: z.number().nullable(),
  degradation: z.number().nullable(),
});

const replayStrategySummarySchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  driver_name: z.string(),
  start_compound: z.string().nullable(),
  first_stop_lap: z.number().nullable(),
  total_stops: z.number(),
  compounds_used: z.array(z.string()).default([]),
  laps_per_compound: z.record(z.string(), z.number()).default({}),
  stints: z.array(replayStrategyStintSchema).default([]),
  summary: z.string().default(''),
});

export const replayDatasetSchema = z.object({
  session: replaySessionSummarySchema,
  drivers: z.array(replayDriverSchema).default([]),
  laps: z.array(replayLapSchema).default([]),
  positions: z.array(replayPositionSchema).default([]),
  race_control: z.array(replayRaceControlSchema).default([]),
  stints: z.array(replayStintSchema).default([]),
  pit_stops: z.array(replayPitStopSchema).default([]),
  weather: z.array(replayWeatherSchema).default([]),
  team_radio: z.array(replayTeamRadioSchema).default([]),
  tyre_per_lap: z.array(replayTyrePerLapSchema).default([]),
  strategy_summaries: z.array(replayStrategySummarySchema).default([]),
  track: z.object({
    points: z.array(replayTrackPointSchema).default([]),
    source_driver_number: z.number().default(0),
  }),
  drs_zones: z
    .array(
      z.object({
        start_fraction: z.number(),
        end_fraction: z.number(),
        sample_count: z.number(),
        label: z.string().optional(),
      })
    )
    .optional(),
  total_laps: z.number().default(0),
  start_time: z.string(),
  end_time: z.string(),
  warnings: z.array(z.string()).optional(),
});

export type TelemetryResponseDto = z.infer<typeof telemetryResponseSchema>;
export type ReplaySessionsDto = z.infer<typeof replaySessionsSchema>;
export type ReplayDatasetDto = z.infer<typeof replayDatasetSchema>;
