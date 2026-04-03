import monacoSvg from '../assets/tracks/monaco.svg?raw';
import monzaSvg from '../assets/tracks/monza.svg?raw';
import melbourneSvg from '../assets/tracks/melbourne.svg?raw';
import cotaSvg from '../assets/tracks/cota.svg?raw';
import silverstoneSvg from '../assets/tracks/silverstone.svg?raw';
import spaSvg from '../assets/tracks/spa.svg?raw';
import bahrainSvg from '../assets/tracks/bahrain.svg?raw';
import suzukaSvg from '../assets/tracks/suzuka.svg?raw';
import interlagosSvg from '../assets/tracks/interlagos.svg?raw';
import gillesSvg from '../assets/tracks/gilles-villeneuve.svg?raw';

const TRACK_SVGS: Record<string, string> = {
  monaco: monacoSvg,
  monza: monzaSvg,
  melbourne: melbourneSvg,
  cota: cotaSvg,
  silverstone: silverstoneSvg,
  spa: spaSvg,
  bahrain: bahrainSvg,
  suzuka: suzukaSvg,
  interlagos: interlagosSvg,
  gilles: gillesSvg,
};

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getTrackSvgForCircuit(value: string | undefined | null) {
  if (!value) return null;
  const key = normalizeKey(value);

  if (key.includes('monaco')) return TRACK_SVGS.monaco;
  if (key.includes('monza')) return TRACK_SVGS.monza;
  if (key.includes('melbourne') || key.includes('albert park') || key.includes('australia')) {
    return TRACK_SVGS.melbourne;
  }
  if (key.includes('circuit of the americas') || key.includes('austin') || key.includes('cota')) {
    return TRACK_SVGS.cota;
  }
  if (key.includes('silverstone')) return TRACK_SVGS.silverstone;
  if (key.includes('spa')) return TRACK_SVGS.spa;
  if (key.includes('bahrain') || key.includes('sakhir')) return TRACK_SVGS.bahrain;
  if (key.includes('suzuka')) return TRACK_SVGS.suzuka;
  if (key.includes('interlagos') || key.includes('sao paulo') || key.includes('brazil')) {
    return TRACK_SVGS.interlagos;
  }
  if (key.includes('gilles villeneuve') || key.includes('montreal') || key.includes('canada')) {
    return TRACK_SVGS.gilles;
  }

  return null;
}
