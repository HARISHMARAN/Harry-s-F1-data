import type { DashboardData, DriverPosition, MaxStats } from '../types/f1';

// Fetching TRUE live timing data from the local InfluxDB powered by fastf1
const INFLUX_URL = '/influx/api/v2/query?org=f1';
const INFLUX_TOKEN = 'LoOFvHw1tUXrUZ8oUqaozmEjxxG9UNO5H5YfRI4cGu306xwQVu_KMNxRYRMrWbhdD886N2PuRgpo9v4v_58pHw==';

// Static Data Lookup for drivers based on the f1-live-data importer schema
interface DriverLookupEntry {
  no: number;
  team: string;
  color: string;
  name: string;
}

const D_LOOKUP: Record<string, DriverLookupEntry> = {
  'ANT': { no: 12, team: 'Mercedes', color: '#27F4D2', name: 'Andrea Kimi Antonelli' },
  'RUS': { no: 63, team: 'Mercedes', color: '#27F4D2', name: 'George Russell' },
  'HAM': { no: 44, team: 'Ferrari', color: '#E8002D', name: 'Lewis Hamilton' },
  'LEC': { no: 16, team: 'Ferrari', color: '#E8002D', name: 'Charles Leclerc' },
  'VER': { no: 3,  team: 'Red Bull Racing', color: '#3671C6', name: 'Max Verstappen' },
  'HAD': { no: 6,  team: 'Red Bull Racing', color: '#3671C6', name: 'Isack Hadjar' },
  'PIA': { no: 81, team: 'McLaren', color: '#FF8000', name: 'Oscar Piastri' },
  'NOR': { no: 1,  team: 'McLaren', color: '#FF8000', name: 'Lando Norris' },
  'ALO': { no: 14, team: 'Aston Martin', color: '#229971', name: 'Fernando Alonso' },
  'STR': { no: 18, team: 'Aston Martin', color: '#229971', name: 'Lance Stroll' },
  'GAS': { no: 10, team: 'Alpine', color: '#00A1E8', name: 'Pierre Gasly' },
  'COL': { no: 43, team: 'Alpine', color: '#00A1E8', name: 'Franco Colapinto' },
  'LAW': { no: 30, team: 'Racing Bulls', color: '#6692FF', name: 'Liam Lawson' },
  'LIN': { no: 41, team: 'Racing Bulls', color: '#6692FF', name: 'Arvid Lindblad' },
  'OCO': { no: 31, team: 'Haas', color: '#B6BABD', name: 'Esteban Ocon' },
  'BEA': { no: 87, team: 'Haas', color: '#B6BABD', name: 'Oliver Bearman' },
  'HUL': { no: 27, team: 'Audi', color: '#A7ADB1', name: 'Nico Hulkenberg' },
  'BOR': { no: 5,  team: 'Audi', color: '#A7ADB1', name: 'Gabriel Bortoleto' },
  'SAI': { no: 55, team: 'Williams', color: '#1868DB', name: 'Carlos Sainz' },
  'ALB': { no: 23, team: 'Williams', color: '#1868DB', name: 'Alex Albon' },
  'PER': { no: 11, team: 'Cadillac', color: '#AAAAAD', name: 'Sergio Perez' },
  'BOT': { no: 77, team: 'Cadillac', color: '#AAAAAD', name: 'Valtteri Bottas' }
};

export async function fetchLiveDashboardData(): Promise<DashboardData> {
  try {
    const fluxQuery = `
      from(bucket: "data")
        |> range(start: -5m)
        |> filter(fn: (r) => r["_measurement"] == "gapToLeader" and r["_field"] == "GapToLeader")
        |> last()
    `;
    
    const lapsQuery = `
      from(bucket: "data")
        |> range(start: -5m)
        |> filter(fn: (r) => r["_measurement"] == "numberOfLaps" and r["_field"] == "NumberOfLaps")
        |> last()
    `;

    // Max Verstappen Telemetry
    const maxLapQuery = `
      from(bucket: "data")
        |> range(start: -3h)
        |> filter(fn: (r) => r["_measurement"] == "lastLapTime" and r["driver"] == "VER")
        |> min()
    `;

    const maxSpeedQuery = `
      from(bucket: "data")
        |> range(start: -3h)
        |> filter(fn: (r) => r["_measurement"] == "speedTrap" and r["driver"] == "VER")
        |> max()
    `;

    const requestOptions = {
      method: "POST",
      headers: {
        "Authorization": `Token ${INFLUX_TOKEN}`,
        "Content-type": "application/vnd.flux",
        "Accept": "application/csv"
      }
    };

    const [response, lapsResponse, maxLapResponse, maxSpeedResponse] = await Promise.all([
      fetch(INFLUX_URL, { ...requestOptions, body: fluxQuery }),
      fetch(INFLUX_URL, { ...requestOptions, body: lapsQuery }),
      fetch(INFLUX_URL, { ...requestOptions, body: maxLapQuery }),
      fetch(INFLUX_URL, { ...requestOptions, body: maxSpeedQuery })
    ]);

    if (!response.ok) {
      throw new Error(`Failed to fetch from InfluxDB: ${response.status}`);
    }

    const csvData = await response.text();
    // Use regex to properly handle Windows CRLF line endings from InfluxDB
    const lines = csvData.trim().split(/\r?\n/);
    const leaderboardData: Array<{ driver: string; gap: number }> = [];
    
    // Parse Influx CSV: _,result,table,_start,_stop,_time,_value,_field,_measurement,driver
    // Starts at index 1 due to header. We dynamically locate `_value` and `driver` columns.
    if (lines.length > 1) {
      const headers = lines[0].split(',');
      const valIdx = headers.indexOf('_value');
      const driverIdx = headers.indexOf('driver');

      if (valIdx > -1 && driverIdx > -1) {
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length > Math.max(valIdx, driverIdx)) {
            const rawValue = parseFloat(cols[valIdx]);
            const driverStr = cols[driverIdx].replace(/\r$/, '');
            leaderboardData.push({ driver: driverStr, gap: rawValue });
          }
        }
      }
    }

    // Parse Lap Data to find current max lap
    let currentLap = 0;
    if (lapsResponse.ok) {
       const lapsCsv = await lapsResponse.text();
       const lLines = lapsCsv.trim().split(/\r?\n/);
       if (lLines.length > 1) {
         const headers = lLines[0].split(',');
         const valIdx = headers.indexOf('_value');
         if (valIdx > -1) {
            for (let i = 1; i < lLines.length; i++) {
              const cols = lLines[i].split(',');
              if (cols.length > valIdx) {
                const lap = parseInt(cols[valIdx], 10);
                if (lap > currentLap) currentLap = lap;
              }
            }
         }
       }
    }

    // Sort leaderboard by gap (0.0 is leader)
    leaderboardData.sort((a, b) => a.gap - b.gap);

    // Map to Dashboard UI objects
    let pos = 1;
    const mappedLeaderboard: DriverPosition[] = leaderboardData.map((driverGap) => {
      const meta = D_LOOKUP[driverGap.driver] ?? {
        no: 0,
        team: 'Unknown',
        color: '#FFFFFF',
        name: driverGap.driver,
      };
      
      return {
        position: pos++,
        driver_number: meta.no,
        name_acronym: driverGap.driver,
        full_name: meta.name,
        team_name: meta.team,
        team_colour: meta.color,
        // Hack: Display the gap float smoothly. We will use it as gap display in UI
        date:
          driverGap.gap === 0
            ? "LEADER"
            : driverGap.gap >= 500
              ? "LAPPED"
              : "+" + driverGap.gap.toFixed(3)
      };
    });

    // Parse Max's Best Lap
    let maxBestLap = 0;
    if (maxLapResponse.ok) {
       const lapCsv = await maxLapResponse.text();
       const mLines = lapCsv.trim().split(/\r?\n/);
       if (mLines.length > 1) {
         const headers = mLines[0].split(',');
         const valIdx = headers.indexOf('_value');
         if (valIdx > -1) {
            for (let i = 1; i < mLines.length; i++) {
              const cols = mLines[i].split(',');
              if (cols.length > valIdx) {
                const val = parseFloat(cols[valIdx]);
                if (val > 0) maxBestLap = val;
              }
            }
         }
       }
    }

    // Parse Max's Top Speed
    let maxTopSpeed = 0;
    if (maxSpeedResponse.ok) {
       const spCsv = await maxSpeedResponse.text();
       const sLines = spCsv.trim().split(/\r?\n/);
       if (sLines.length > 1) {
         const headers = sLines[0].split(',');
         const valIdx = headers.indexOf('_value');
         if (valIdx > -1) {
            for (let i = 1; i < sLines.length; i++) {
              const cols = sLines[i].split(',');
              if (cols.length > valIdx) {
                const val = parseInt(cols[valIdx], 10);
                if (val > 0) maxTopSpeed = val;
              }
            }
         }
       }
    }

    // Format Best Lap Function (seconds to M:SS.MMM)
    const formatLapTime = (sec: number) => {
      if (!sec) return '0.00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    const maxStats: MaxStats = {
      best_lap: formatLapTime(maxBestLap),
      top_speed: maxTopSpeed.toString(),
      started: 'API RESTRICTED',
      tyres: 'API RESTRICTED'
    };

    // Provide generic session info since InfluxDB only streams raw driver metrics, not schedule metadata
    return {
      session: {
        session_key: "LIVE",
        session_name: "Live Tracking",
        session_type: "Race",
        country_name: "World",
        location: "Global Data Stream",
        circuit_short_name: "Live Stream",
        date_start: new Date().toISOString(),
        current_lap: currentLap
      },
      leaderboard: mappedLeaderboard,
      max_stats: maxStats
    };

  } catch (err: unknown) {
    console.error("Local InfluxDB backend error:", err);
    throw new Error("Unable to connect to the fastf1 datastream. Please ensure Docker is running.");
  }
}
