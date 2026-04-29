import type { DashboardData } from '../types/f1';
import { getLiveDashboardData } from '../data-access/telemetryClient';

export async function fetchLiveDashboardData(): Promise<DashboardData> {
  return getLiveDashboardData();
}
