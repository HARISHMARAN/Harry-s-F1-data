// Basic types for Jolpica API responses to satisfy TS
interface Driver {
  givenName: string;
  familyName: string;
}

interface Constructor {
  name: string;
}

interface FastestLap {
  rank: string;
  lap: string;
  Time: {
    time: string;
  };
}

interface ResultRow {
  position: string;
  grid: string;
  Driver: Driver;
  Constructor: Constructor;
  FastestLap?: FastestLap;
}

interface RaceRow {
  round: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    Location: {
      country: string;
    };
  };
}

export async function getChatbotResponse(message: string): Promise<string> {
  const text = message.toLowerCase().replace('bugrain', 'bahrain');
  
  // Extract year
  const yearMatch = text.match(/(19\d\d|20\d\d)/);
  const year = yearMatch ? yearMatch[1] : 'current';

  // Common intents
  const isFastestLap = text.includes('fastest lap') || text.includes('fastest');
  const isPole = text.includes('pole') || text.includes('qualifying');
  const isChampionship = text.includes('championship') || text.includes('standings') || text.includes('points');
  
  // Extract country/race
  const races = [
    'bahrain', 'saudi', 'australia', 'japan', 'china', 'miami', 'emilia', 'monaco',
    'canada', 'spain', 'austria', 'britain', 'silverstone', 'hungary', 'belgium',
    'netherlands', 'dutch', 'italy', 'monza', 'azerbaijan', 'singapore', 'usa',
    'austin', 'mexico', 'brazil', 'vegas', 'qatar', 'abu dhabi', 'jeddah', 'imola'
  ];
  const foundRace = races.find(r => text.includes(r));

  if (isChampionship) {
      try {
          const res = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`);
          const data = await res.json();
          const standing = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
          return `The ${year === 'current' ? 'current' : year} F1 Championship is led by ${standing[0].Driver.givenName} ${standing[0].Driver.familyName} with ${standing[0].points} points. In second place is ${standing[1].Driver.givenName} ${standing[1].Driver.familyName} with ${standing[1].points} points, followed by ${standing[2].Driver.familyName} in third.`;
      } catch {
          return `I couldn't fetch the championship standings for ${year}. The season might not have started yet.`;
      }
  }

  if (foundRace) {
      try {
          // fetch all races in that year to find the round
          const res = await fetch(`https://api.jolpi.ca/ergast/f1/${year}.json`);
          const data = await res.json();
          const raceList = data.MRData.RaceTable.Races as RaceRow[];
          const targetRace = raceList.find((r) => 
            r.Circuit.circuitId.toLowerCase().includes(foundRace) || 
            r.Circuit.Location.country.toLowerCase().includes(foundRace) || 
            r.raceName.toLowerCase().includes(foundRace)
          );
          
          if (!targetRace) {
              return `I couldn't find a race matching "${foundRace}" in the ${year} season.`;
          }

          const resultsRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${targetRace.round}/results.json`);
          const resultsData = await resultsRes.json();
          
          if (!resultsData.MRData.RaceTable.Races || resultsData.MRData.RaceTable.Races.length === 0) {
              return `The ${year} ${targetRace.raceName} hasn't happened yet or the results are unavailable.`;
          }
          
          const results = resultsData.MRData.RaceTable.Races[0].Results as ResultRow[];

          if (isFastestLap) {
              const fastest = results.find((r) => r.FastestLap && r.FastestLap.rank === '1');
              if (fastest && fastest.FastestLap) {
                  return `The fastest lap for the ${year} ${targetRace.raceName} was set by ${fastest.Driver.givenName} ${fastest.Driver.familyName} driving for ${fastest.Constructor.name}, with a time of ${fastest.FastestLap.Time.time} on lap ${fastest.FastestLap.lap}.`;
              }
              return `I couldn't find the fastest lap data for the ${year} ${targetRace.raceName}.`;
          }

          if (isPole) {
              const pole = results.find((r) => r.grid === '1');
              if (pole) {
                  return `${pole.Driver.givenName} ${pole.Driver.familyName} started on pole position at the ${year} ${targetRace.raceName} for ${pole.Constructor.name}.`;
              }
          }

          // Default to winner
          const winner = results.find((r) => r.position === '1');
          if (winner) {
              return `The ${year} ${targetRace.raceName} was won by ${winner.Driver.givenName} ${winner.Driver.familyName} driving for ${winner.Constructor.name}. In second place was ${results[1].Driver.givenName} ${results[1].Driver.familyName}, and third was ${results[2].Driver.givenName} ${results[2].Driver.familyName}.`;
          }

      } catch {
          return `I encountered an error looking up data for the ${year} race in ${foundRace}.`;
      }
  }

  // General questions fallback
  if (text.includes("how many") && text.includes("championships")) {
      return "Michael Schumacher and Lewis Hamilton hold the record for the most Formula 1 World Championships, with 7 each.";
  }
  if (text.includes("lewis hamilton") && text.includes("teammate")) {
      return "Lewis Hamilton's teammate depends on the season. In 2024, it is George Russell at Mercedes. In 2025, he moved to Ferrari to partner Charles Leclerc.";
  }
  if (text.includes("lando norris") && text.includes("first win")) {
      return "Lando Norris secured his first Formula 1 victory at the 2024 Miami Grand Prix.";
  }
  if (text.includes("kimi antonelli")) {
      return "Andrea Kimi Antonelli is a highly rated Mercedes junior driver who made his F1 debut in 2025 for Mercedes, replacing Lewis Hamilton.";
  }

  return "I am the Harry's Pitwall AI assistant. I can look up specific Formula 1 historical data for you! Try asking me:\n- 'Who won in Bahrain 2024?'\n- 'What is the fastest lap for Bahrain 2024?'\n- 'Who is leading the 2024 championship?'";
}