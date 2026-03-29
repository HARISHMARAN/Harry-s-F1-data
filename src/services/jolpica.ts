// Fetching historical completed race data from Jolpica (Ergast replacement)

// Reuse the native D_LOOKUP to attach correct team colors
const D_LOOKUP: Record<string, any> = {
  'VER': { color: '#3671C6', name: 'Max Verstappen' },
  'PER': { color: '#AAAAAD', name: 'Sergio Perez' },
  'HAM': { color: '#E8002D', name: 'Lewis Hamilton' },
  'RUS': { color: '#27F4D2', name: 'George Russell' },
  'LEC': { color: '#E8002D', name: 'Charles Leclerc' },
  'SAI': { color: '#1868DB', name: 'Carlos Sainz' },
  'NOR': { color: '#FF8000', name: 'Lando Norris' },
  'PIA': { color: '#FF8000', name: 'Oscar Piastri' },
  'ALO': { color: '#229971', name: 'Fernando Alonso' },
  'STR': { color: '#229971', name: 'Lance Stroll' },
  'GAS': { color: '#00A1E8', name: 'Pierre Gasly' },
  'OCO': { color: '#B6BABD', name: 'Esteban Ocon' },
  'ALB': { color: '#1868DB', name: 'Alex Albon' },
  'TSU': { color: '#6692FF', name: 'Yuki Tsunoda' },
  'RIC': { color: '#6692FF', name: 'Daniel Ricciardo' },
  'LAW': { color: '#6692FF', name: 'Liam Lawson' },
  'BOT': { color: '#AAAAAD', name: 'Valtteri Bottas' },
  'ZHO': { color: '#00e701', name: 'Zhou Guanyu' },
  'MAG': { color: '#B6BABD', name: 'Kevin Magnussen' },
  'HUL': { color: '#A7ADB1', name: 'Nico Hulkenberg' },
  'SAR': { color: '#1868DB', name: 'Logan Sargeant' },
  'COL': { color: '#00A1E8', name: 'Franco Colapinto' },
  'BEA': { color: '#B6BABD', name: 'Oliver Bearman' },
  'HAD': { color: '#3671C6', name: 'Isack Hadjar' },
  'LIN': { color: '#6692FF', name: 'Arvid Lindblad' },
  'BOR': { color: '#A7ADB1', name: 'Gabriel Bortoleto' },
  'ANT': { color: '#27F4D2', name: 'Andrea Kimi Antonelli' },
};

export async function fetchSeasonRaces(year: string) {
  try {
    const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}.json`);
    if (!response.ok) throw new Error("Jolpica API Failed");

    const json = await response.json();
    const races = json.MRData.RaceTable.Races || [];
    
    return races.map((r: any) => ({
      round: r.round,
      raceName: r.raceName
    }));
  } catch (err) {
    console.error("Failed to fetch season races", err);
    return [];
  }
}

export async function fetchHistoricalData(year?: string, round?: string) {
  try {
    // Determine the precise endpoint
    let endpoint = 'https://api.jolpi.ca/ergast/f1/current/last/results.json';
    if (year && round) {
      endpoint = `https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`;
    }

    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("Jolpica API Failed");

    const json = await response.json();
    const race = json.MRData.RaceTable.Races[0];
    
    if (!race) throw new Error("No completed race data found for this selection.");

    const results = race.Results;

    let maxBestLap = '--:--.---';
    let maxGrid = '--';
    let maxPos = '--';

    const mappedLeaderboard = results.map((r: any) => {
      const code = r.Driver.code || 'UKN';
      const meta = D_LOOKUP[code] || { color: '#ffffff', name: `${r.Driver.givenName} ${r.Driver.familyName}` };

      // Extract Max Verstappen logic
      if (code === 'VER') {
        maxGrid = r.grid;
        if (r.FastestLap && r.FastestLap.Time) {
          maxBestLap = r.FastestLap.Time.time;
        }
      }

      return {
        position: parseInt(r.position, 10),
        driver_number: parseInt(r.number, 10),
        name_acronym: code,
        full_name: meta.name,
        team_name: r.Constructor.name,
        team_colour: meta.color,
        date: r.status === "Finished" && r.Time ? r.Time.time : r.status
      };
    });

    return {
      session: {
        session_key: race.round,
        session_name: race.raceName,
        session_type: "Historical Race",
        country_name: race.Circuit.Location.country,
        location: race.Circuit.circuitName,
        circuit_short_name: race.Circuit.circuitId,
        date_start: `${race.date}T${race.time || '00:00:00Z'}`,
        current_lap: 'FINISHED'
      },
      leaderboard: mappedLeaderboard,
      max_stats: {
        best_lap: maxBestLap,
        top_speed: 'UNAVAILABLE',
        started: `P${maxGrid}`,
        tyres: 'STATIC DATA'
      }
    };

  } catch (err) {
    console.error("Jolpica api failed", err);
    throw new Error("Unable to load latest completed race from Jolpica.");
  }
}
