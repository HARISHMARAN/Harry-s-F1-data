import type {
  ReplayDataset,
  ReplaySessionSummary,
} from '../types/f1';

/**
 * Harry's Pitwall - Replay Service (v2)
 * 
 * Instead of fetching raw telemetry from OpenF1 directly in the browser,
 * this service calls our local Python backend which uses FastF1 for
 * high-performance data processing and local caching.
 */

export async function fetchReplaySessions(year: number): Promise<ReplaySessionSummary[]> {
  try {
    const response = await fetch(`/api/sessions?year=${year}`);
    if (!response.ok) {
      throw new Error('Failed to fetch replay sessions from local backend.');
    }
    return await response.json();
  } catch (error) {
    console.error('Replay session fetch error:', error);
    throw error;
  }
}

export async function fetchReplayDataset(
  session: ReplaySessionSummary,
  onProgress?: (message: string) => void,
): Promise<ReplayDataset> {
  onProgress?.('Fetching optimized race telemetry from local Python backend...');

  try {
    const response = await fetch(`/api/replay/${session.year}/${session.round}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || 'Failed to fetch replay dataset.');
    }
    
    onProgress?.('Processing dashboard replay stream...');
    const data = await response.json();
    
    // Ensure the data matches our ReplayDataset interface
    return {
      ...data,
      // If the backend didn't provide positions, we mock them to avoid UI crashes
      positions: data.positions || []
    };
  } catch (error) {
    console.error('Replay dataset fetch error:', error);
    throw error;
  }
}
