import type {
  ReplayDataset,
  ReplayDriver,
  ReplayLap,
  ReplayPitStop,
  ReplayRaceControlMessage,
  ReplayStrategySummary,
  ReplayWeatherSample,
} from '../types/f1';

type UiPositionPoint = {
  lap: number;
  position: number;
};

type UiPositionSeries = {
  driver: ReplayDriver;
  points: UiPositionPoint[];
  finalPosition: number;
};

type UiStrategySummary = {
  driver: ReplayDriver;
  startCompound: string | null;
  firstStopLap: number | null;
  totalStops: number;
  compoundsInOrder: string[];
  averageLap: number | null;
  narrative: string;
  stints: Array<{
    compound: string;
    lapStart: number;
    lapEnd: number;
    laps: number;
    degradation: number | null;
  }>;
};

interface RaceIntelligencePanelProps {
  dataset: ReplayDataset;
  selectedDriverNumber: number | null;
}

const MODERN_YEAR_THRESHOLD = 2023;
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#ea3323',
  MEDIUM: '#f4b400',
  HARD: '#b4b8c0',
  INTERMEDIATE: '#00d2be',
  WET: '#2a95ff',
  UNKNOWN: '#7b8391',
};

function normalizeCompound(compound: string | null | undefined) {
  const normalized = (compound ?? '').trim().toUpperCase();
  return normalized || 'UNKNOWN';
}

function formatLapTime(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return '--:--.---';
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const minutes = Math.floor(totalMs / 60000);
  const remaining = totalMs - minutes * 60000;
  const secs = Math.floor(remaining / 1000);
  const millis = remaining % 1000;
  return `${minutes}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

function formatDuration(startIso: string, endIso: string) {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '--';
  const minutes = Math.round((end - start) / 60000);
  return `${minutes} min`;
}

function formatTime(iso: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return '--:--';
  return new Date(time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatWeather(sample: ReplayWeatherSample) {
  const air = Number.isFinite(sample.air_temperature) ? `${sample.air_temperature}°C` : '--';
  const track = Number.isFinite(sample.track_temperature) ? `${sample.track_temperature}°C` : '--';
  const rain = Number.isFinite(sample.rainfall) ? `${sample.rainfall} mm` : '--';
  const wind = Number.isFinite(sample.wind_speed) ? `${sample.wind_speed} m/s` : '--';
  return { air, track, rain, wind };
}

function buildDriverMap(drivers: ReplayDriver[]) {
  return new Map(drivers.map((driver) => [driver.driver_number, driver]));
}

function inferFinalPositions(dataset: ReplayDataset) {
  const latestByDriver = new Map<number, { position: number; timestamp: number }>();

  dataset.positions.forEach((sample) => {
    const timestamp = Date.parse(sample.date);
    if (!Number.isFinite(timestamp)) return;
    const prev = latestByDriver.get(sample.driver_number);
    if (!prev || timestamp >= prev.timestamp) {
      latestByDriver.set(sample.driver_number, { position: sample.position, timestamp });
    }
  });

  if (latestByDriver.size > 0) return latestByDriver;

  dataset.laps.forEach((lap) => {
    if (!Number.isFinite(lap.position)) return;
    const prev = latestByDriver.get(lap.driver_number);
    if (!prev || lap.lap_number >= prev.timestamp) {
      latestByDriver.set(lap.driver_number, { position: lap.position as number, timestamp: lap.lap_number });
    }
  });

  return latestByDriver;
}

function getLapRowsForDriver(laps: ReplayLap[], driverNumber: number) {
  return laps
    .filter((lap) => lap.driver_number === driverNumber)
    .sort((a, b) => a.lap_number - b.lap_number);
}

function buildFallbackStrategySummary(driver: ReplayDriver, laps: ReplayLap[]): UiStrategySummary {
  const ordered = [...laps].sort((a, b) => a.lap_number - b.lap_number);
  const stints: UiStrategySummary['stints'] = [];
  const compoundOrder: string[] = [];
  let current: UiStrategySummary['stints'][number] | null = null;

  ordered.forEach((lap) => {
    const compound = normalizeCompound(lap.compound);
    if (!current || current.compound !== compound) {
      if (current) stints.push(current);
      current = {
        compound,
        lapStart: lap.lap_number,
        lapEnd: lap.lap_number,
        laps: 1,
        degradation: null,
      };
      compoundOrder.push(compound);
    } else {
      current.lapEnd = lap.lap_number;
      current.laps += 1;
    }
  });

  if (current) stints.push(current);

  stints.forEach((stint) => {
    const stintLaps = ordered.filter((lap) => lap.lap_number >= stint.lapStart && lap.lap_number <= stint.lapEnd);
    const firstTimed = stintLaps.find((lap) => lap.lap_duration !== null)?.lap_duration ?? null;
    const lastTimed = [...stintLaps].reverse().find((lap) => lap.lap_duration !== null)?.lap_duration ?? null;
    if (firstTimed !== null && lastTimed !== null) {
      stint.degradation = Number((lastTimed - firstTimed).toFixed(3));
    }
  });

  const pitOutLaps = ordered.filter((lap) => lap.is_pit_out_lap).map((lap) => lap.lap_number);
  const validLapDurations = ordered
    .map((lap) => lap.lap_duration)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const averageLap = validLapDurations.length
    ? validLapDurations.reduce((sum, value) => sum + value, 0) / validLapDurations.length
    : null;

  const firstStopLap = pitOutLaps.length > 0 ? Math.max(1, pitOutLaps[0] - 1) : null;
  const totalStops = pitOutLaps.length;
  const startCompound = compoundOrder[0] ?? null;

  return {
    driver,
    startCompound,
    firstStopLap,
    totalStops,
    compoundsInOrder: compoundOrder,
    averageLap,
    stints,
    narrative: [
      startCompound ? `Started on ${startCompound}` : null,
      totalStops > 0 ? `${totalStops} stop${totalStops > 1 ? 's' : ''}` : 'No stops',
      compoundOrder.length > 0 ? `Compounds: ${compoundOrder.join(' → ')}` : null,
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function mapStrategySummary(driver: ReplayDriver, summary: ReplayStrategySummary): UiStrategySummary {
  const stints = summary.stints.map((stint) => ({
    compound: normalizeCompound(stint.compound),
    lapStart: stint.lap_start,
    lapEnd: stint.lap_end,
    laps: stint.laps,
    degradation: stint.degradation,
  }));

  return {
    driver,
    startCompound: summary.start_compound,
    firstStopLap: summary.first_stop_lap,
    totalStops: summary.total_stops,
    compoundsInOrder: summary.compounds_used.map((compound) => normalizeCompound(compound)),
    averageLap: null,
    stints,
    narrative: summary.summary,
  };
}

function getStrategySummaryForDriver(dataset: ReplayDataset, driver: ReplayDriver) {
  const strategy = dataset.strategy_summaries?.find((entry) => entry.driver_number === driver.driver_number);
  if (strategy) return mapStrategySummary(driver, strategy);
  const laps = getLapRowsForDriver(dataset.laps, driver.driver_number);
  return buildFallbackStrategySummary(driver, laps);
}

function buildPositionSeries(dataset: ReplayDataset, candidateDrivers: ReplayDriver[]) {
  const series: UiPositionSeries[] = [];

  candidateDrivers.forEach((driver) => {
    const lapPositions = dataset.laps
      .filter((lap) => lap.driver_number === driver.driver_number && Number.isFinite(lap.position))
      .map((lap) => ({ lap: lap.lap_number, position: lap.position as number }))
      .sort((a, b) => a.lap - b.lap);

    if (!lapPositions.length) return;

    series.push({
      driver,
      points: lapPositions,
      finalPosition: lapPositions[lapPositions.length - 1].position,
    });
  });

  return series.sort((a, b) => a.finalPosition - b.finalPosition);
}

function flagTone(message: ReplayRaceControlMessage) {
  const flag = (message.flag ?? '').toUpperCase();
  if (flag.includes('RED')) return '#ff4d4f';
  if (flag.includes('YELLOW')) return '#f4b400';
  if (flag.includes('GREEN') || flag.includes('CLEAR')) return '#00d2be';
  return 'var(--accent-blue)';
}

function getPitTimeline(dataset: ReplayDataset) {
  if (dataset.pit_stops && dataset.pit_stops.length > 0) {
    return [...dataset.pit_stops].sort((a, b) => a.pit_out_lap - b.pit_out_lap);
  }

  return dataset.laps
    .filter((lap) => lap.is_pit_out_lap && lap.lap_number > 1)
    .map((lap) => ({
      session_key: lap.session_key,
      driver_number: lap.driver_number,
      pit_in_lap: Math.max(1, lap.lap_number - 1),
      pit_out_lap: lap.lap_number,
      compound_in: null,
      compound_out: normalizeCompound(lap.compound),
    }))
    .sort((a, b) => a.pit_out_lap - b.pit_out_lap);
}

function downsampleWeather(samples: ReplayWeatherSample[], target = 8) {
  if (samples.length <= target) return samples;
  const sorted = [...samples].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const picked: ReplayWeatherSample[] = [];
  for (let index = 0; index < target; index += 1) {
    const ratio = index / Math.max(target - 1, 1);
    const sourceIndex = Math.round(ratio * (sorted.length - 1));
    picked.push(sorted[sourceIndex]);
  }
  return picked;
}

function CardTitle({ children }: { children: string }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: '0.68rem',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}
    >
      {children}
    </p>
  );
}

function TyreStintChart({ summary }: { summary: UiStrategySummary }) {
  const total = Math.max(1, summary.stints.reduce((sum, stint) => sum + stint.laps, 0));

  if (!summary.stints.length) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No stint data available.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '0.55rem' }}>
      <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-light)', minHeight: 22 }}>
        {summary.stints.map((stint) => (
          <div
            key={`${stint.compound}-${stint.lapStart}`}
            title={`${stint.compound}: L${stint.lapStart}-${stint.lapEnd}`}
            style={{
              width: `${(stint.laps / total) * 100}%`,
              background: COMPOUND_COLORS[stint.compound] ?? COMPOUND_COLORS.UNKNOWN,
              opacity: 0.9,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {summary.stints.map((stint) => (
          <span key={`${stint.compound}-${stint.lapStart}-legend`} className="speed-chip" style={{ fontSize: '0.62rem', padding: '0.2rem 0.45rem' }}>
            {stint.compound} L{stint.lapStart}-{stint.lapEnd}
          </span>
        ))}
      </div>
    </div>
  );
}

function PitTimeline({ pitStops, driverMap }: { pitStops: ReplayPitStop[]; driverMap: Map<number, ReplayDriver> }) {
  if (!pitStops.length) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No pit-stop timeline available for this race.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '0.45rem', maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
      {pitStops.slice(0, 16).map((stop, index) => {
        const driver = driverMap.get(stop.driver_number);
        return (
          <div
            key={`${stop.driver_number}-${stop.pit_out_lap}-${index}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.6rem',
              padding: '0.45rem 0.6rem',
              borderRadius: 10,
              border: '1px solid var(--border-light)',
              background: 'rgba(255,255,255,0.03)',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              {driver?.name_acronym ?? `#${stop.driver_number}`}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              L{stop.pit_in_lap} → L{stop.pit_out_lap}
              {stop.compound_out ? ` • ${normalizeCompound(stop.compound_out)}` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RaceControlFeed({ messages }: { messages: ReplayRaceControlMessage[] }) {
  if (!messages.length) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No race control messages available.</p>;
  }

  const ordered = [...messages]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 10);

  return (
    <div style={{ display: 'grid', gap: '0.45rem', maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
      {ordered.map((message, index) => (
        <div
          key={`${message.date}-${message.driver_number ?? 'all'}-${index}`}
          style={{
            padding: '0.55rem 0.65rem',
            borderRadius: 10,
            border: '1px solid var(--border-light)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ color: flagTone(message), fontSize: '0.67rem', fontWeight: 800, letterSpacing: '0.08em' }}>
              {(message.flag ?? message.category ?? 'CONTROL').toUpperCase()}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.67rem' }}>{formatTime(message.date)}</span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.45, fontSize: '0.78rem' }}>{message.message}</p>
        </div>
      ))}
    </div>
  );
}

function WeatherStrip({ weather }: { weather: ReplayWeatherSample[] }) {
  if (!weather.length) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No weather data available for this race.</p>;
  }

  const samples = downsampleWeather(weather, 8);

  return (
    <div style={{ display: 'grid', gap: '0.45rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${samples.length}, minmax(112px, 1fr))`, gap: '0.45rem', overflowX: 'auto', paddingBottom: 4 }}>
        {samples.map((sample, index) => {
          const parsed = formatWeather(sample);
          return (
            <div
              key={`${sample.date}-${index}`}
              style={{
                minWidth: 112,
                padding: '0.5rem',
                borderRadius: 10,
                border: '1px solid var(--border-light)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.64rem', color: 'var(--text-muted)' }}>{formatTime(sample.date)}</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 700 }}>Air {parsed.air}</p>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Track {parsed.track}</p>
              <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)' }}>Rain {parsed.rain} • Wind {parsed.wind}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PositionChart({ series }: { series: UiPositionSeries[] }) {
  const allPoints = series.flatMap((row) => row.points);
  const maxLap = Math.max(1, ...allPoints.map((point) => point.lap));
  const maxPos = Math.max(1, ...allPoints.map((point) => point.position));
  const width = 520;
  const height = 190;
  const padding = 20;

  if (!series.length) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Position evolution is unavailable for this race.</p>;
  }

  const pathForPoints = (points: UiPositionPoint[]) =>
    points
      .map((point, idx) => {
        const x = padding + ((point.lap - 1) / Math.max(1, maxLap - 1)) * (width - padding * 2);
        const y = padding + ((point.position - 1) / Math.max(1, maxPos - 1)) * (height - padding * 2);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

  const xTicks = [1, Math.ceil(maxLap / 2), maxLap];
  const yTicks = [1, Math.ceil(maxPos / 2), maxPos];
  const yForPos = (position: number) =>
    padding + ((position - 1) / Math.max(1, maxPos - 1)) * (height - padding * 2);
  const xForLap = (lap: number) =>
    padding + ((lap - 1) / Math.max(1, maxLap - 1)) * (width - padding * 2);

  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.02)' }}>
        {yTicks.map((tick) => (
          <line
            key={`y-${tick}`}
            x1={padding}
            y1={yForPos(tick)}
            x2={width - padding}
            y2={yForPos(tick)}
            stroke="rgba(255,255,255,0.09)"
            strokeDasharray="4 4"
          />
        ))}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.18)" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.18)" />
        {series.map((row) => (
          <path
            key={row.driver.driver_number}
            d={pathForPoints(row.points)}
            fill="none"
            stroke={`#${row.driver.team_colour}`}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ))}
        {xTicks.map((tick) => (
          <text
            key={`x-label-${tick}`}
            x={xForLap(tick)}
            y={height - 4}
            textAnchor="middle"
            fill="var(--text-muted)"
            style={{ fontSize: 10, letterSpacing: '0.03em' }}
          >
            L{tick}
          </text>
        ))}
        {yTicks.map((tick) => (
          <text
            key={`y-label-${tick}`}
            x={4}
            y={yForPos(tick) + 3}
            fill="var(--text-muted)"
            style={{ fontSize: 10, letterSpacing: '0.03em' }}
          >
            P{tick}
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
        {series.map((row) => (
          <span key={`${row.driver.driver_number}-legend`} className="speed-chip" style={{ fontSize: '0.62rem', padding: '0.2rem 0.45rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '999px', background: `#${row.driver.team_colour}`, display: 'inline-block' }} />
            {row.driver.name_acronym}
          </span>
        ))}
      </div>
    </div>
  );
}

function RadioMoments({ dataset, driverMap }: { dataset: ReplayDataset; driverMap: Map<number, ReplayDriver> }) {
  const rows = [...(dataset.team_radio ?? [])]
    .filter((entry) => Boolean(entry.transcript && entry.transcript.trim().length > 0))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 8);

  if (!rows.length) {
    return <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No radio moments available for this race.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '0.45rem', maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
      {rows.map((row, index) => {
        const driver = row.driver_number !== null ? driverMap.get(row.driver_number) : null;
        return (
          <div
            key={`${row.date}-${row.driver_number ?? 'all'}-${index}`}
            style={{
              padding: '0.55rem 0.65rem',
              borderRadius: 10,
              border: '1px solid var(--border-light)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.69rem', fontWeight: 800, letterSpacing: '0.06em' }}>
                {driver?.name_acronym ?? 'RACE CONTROL AUDIO'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.67rem' }}>{formatTime(row.date)}</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.45, fontSize: '0.78rem' }}>{row.transcript}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function RaceIntelligencePanel({ dataset, selectedDriverNumber }: RaceIntelligencePanelProps) {
  const isModernRace = (dataset.session.year ?? 0) >= MODERN_YEAR_THRESHOLD;
  const driverMap = buildDriverMap(dataset.drivers);
  const finalPositions = inferFinalPositions(dataset);

  const sortedDrivers = dataset.drivers
    .map((driver) => ({
      driver,
      finalPosition: finalPositions.get(driver.driver_number)?.position ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.finalPosition - b.finalPosition);

  const winner = sortedDrivers[0]?.driver ?? dataset.drivers[0];
  const focusedDriver = selectedDriverNumber
    ? driverMap.get(selectedDriverNumber) ?? winner
    : winner;

  const winnerSummary = winner ? getStrategySummaryForDriver(dataset, winner) : null;
  const focusedSummary = focusedDriver ? getStrategySummaryForDriver(dataset, focusedDriver) : null;
  const topSeries = buildPositionSeries(dataset, sortedDrivers.slice(0, 5).map((entry) => entry.driver));
  const pitTimeline = getPitTimeline(dataset);
  const sessionDuration = formatDuration(dataset.start_time, dataset.end_time);
  const stopCount = pitTimeline.length;

  return (
    <div className="glass-panel race-intel-panel" style={{ padding: '1.2rem', display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap' }}>
        <h2 className="panel-title" style={{ margin: 0 }}>Race Intelligence</h2>
        <span className="speed-chip active" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
          {isModernRace ? 'Modern Mode' : 'Archive Mode'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '0.55rem' }}>
        <div className="pit-lane-band" style={{ padding: '0.65rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
          <CardTitle>Winner</CardTitle>
          <strong style={{ fontSize: '0.95rem' }}>{winner?.full_name ?? '--'}</strong>
        </div>
        <div style={{ padding: '0.65rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
          <CardTitle>Pit Stops</CardTitle>
          <strong style={{ fontSize: '0.95rem' }}>{stopCount}</strong>
        </div>
        <div style={{ padding: '0.65rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
          <CardTitle>Duration</CardTitle>
          <strong style={{ fontSize: '0.95rem' }}>{sessionDuration}</strong>
        </div>
        <div style={{ padding: '0.65rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
          <CardTitle>Winner Pace</CardTitle>
          <strong style={{ fontSize: '0.95rem' }}>{formatLapTime(winnerSummary?.averageLap ?? null)}</strong>
        </div>
      </div>

      {winnerSummary && (
        <div className="race-intel-card" style={{ display: 'grid', gap: '0.45rem', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
          <CardTitle>Winner Strategy</CardTitle>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{winnerSummary.narrative || 'Strategy summary unavailable for this race.'}</p>
          <TyreStintChart summary={winnerSummary} />
        </div>
      )}

      <div className="race-intel-modules" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '0.75rem' }}>
        <div className="race-intel-card" style={{ display: 'grid', gap: '0.45rem', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
          <CardTitle>Race Control Feed</CardTitle>
          <RaceControlFeed messages={dataset.race_control ?? []} />
        </div>

        {isModernRace ? (
          <>
            <div className="race-intel-card" style={{ display: 'grid', gap: '0.45rem', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
              <CardTitle>Pit Timeline</CardTitle>
              <PitTimeline pitStops={pitTimeline} driverMap={driverMap} />
            </div>

            <div className="race-intel-card" style={{ display: 'grid', gap: '0.45rem', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
              <CardTitle>Weather Strip</CardTitle>
              <WeatherStrip weather={dataset.weather ?? []} />
            </div>

            <div className="race-intel-card" style={{ display: 'grid', gap: '0.45rem', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
              <CardTitle>Radio Moments</CardTitle>
              <RadioMoments dataset={dataset} driverMap={driverMap} />
            </div>
          </>
        ) : (
          <div className="race-intel-card" style={{ display: 'grid', gap: '0.45rem', padding: '0.75rem', borderRadius: 12, border: '1px dashed var(--border-light)', background: 'rgba(255,255,255,0.02)' }}>
            <CardTitle>Archive Scope</CardTitle>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.45, fontSize: '0.78rem' }}>
              Historical sessions show core race-control, finishing trend, and summary strategy. Weather strip, detailed pit timeline, and radio moments are enabled in modern data mode.
            </p>
          </div>
        )}
      </div>

      <div className="race-intel-card" style={{ display: 'grid', gap: '0.45rem', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
        <CardTitle>Position Evolution (Top 5)</CardTitle>
        <PositionChart series={topSeries} />
      </div>

      {focusedSummary && (
        <div className="race-intel-card" style={{ display: 'grid', gap: '0.45rem', padding: '0.75rem', borderRadius: 12, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.03)' }}>
          <CardTitle>Focused Driver Strategy</CardTitle>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.45, fontSize: '0.78rem' }}>
            {focusedSummary.driver.full_name}: {focusedSummary.compoundsInOrder.join(' → ') || 'No compound data'} • {focusedSummary.totalStops} stop{focusedSummary.totalStops === 1 ? '' : 's'}
            {focusedSummary.firstStopLap ? ` • First stop L${focusedSummary.firstStopLap}` : ''}
          </p>
        </div>
      )}

      {!isModernRace && (
        <div style={{ padding: '0.75rem', borderRadius: 12, border: '1px dashed var(--border-light)', background: 'rgba(255,255,255,0.02)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.82rem' }}>
            Archival mode is active for this race year. Only stable historical modules are shown to avoid implying unavailable telemetry depth.
          </p>
        </div>
      )}
    </div>
  );
}
