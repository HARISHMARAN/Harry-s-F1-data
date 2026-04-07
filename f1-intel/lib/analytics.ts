import type { TelemetryLap, TelemetryMetrics } from '../types/telemetry';

export function calculateMetrics(laps: TelemetryLap[]): TelemetryMetrics {
  if (laps.length === 0) {
    return {
      lapDelta: 0,
      sectorDelta: [0, 0, 0],
      gapToLeader: 0,
      stint: 0,
      paceConsistency: 0,
      tyreDeg: 0,
    };
  }

  const bestLap = Math.min(...laps.map((lap) => lap.lapTime));
  const currentLap = laps[laps.length - 1];
  const lapDelta = Number((currentLap.lapTime - bestLap).toFixed(3));
  const sectorDelta = currentLap.sectors.map((sector, index) => {
    const bestSector = Math.min(...laps.map((lap) => lap.sectors[index]));
    return Number((sector - bestSector).toFixed(3));
  });

  const lapTimes = laps.map((lap) => lap.lapTime);
  const average = lapTimes.reduce((sum, value) => sum + value, 0) / lapTimes.length;
  const variance = lapTimes.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / lapTimes.length;
  const paceConsistency = Number(Math.sqrt(variance).toFixed(3));

  const tyreDeg = Number(((laps[laps.length - 1].lapTime - laps[0].lapTime) / laps.length).toFixed(3));

  return {
    lapDelta,
    sectorDelta,
    gapToLeader: 0,
    stint: currentLap.stint ?? 1,
    paceConsistency,
    tyreDeg,
  };
}
