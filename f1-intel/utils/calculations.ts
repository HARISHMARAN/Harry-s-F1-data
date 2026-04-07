export function normalizeDriverCode(value: string) {
  return value.trim().toUpperCase();
}

export function scorePrediction(scoreInputs: Array<{ driver: string; score: number }>) {
  return scoreInputs.sort((a, b) => b.score - a.score);
}
