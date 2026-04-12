export type DriverMeta = {
  name: string;
  team: string;
  color: string;
};

export const DRIVERS: Record<string, DriverMeta> = {
  ANT: { name: "Andrea Kimi Antonelli", team: "Mercedes", color: "#27F4D2" },
  RUS: { name: "George Russell", team: "Mercedes", color: "#27F4D2" },
  HAM: { name: "Lewis Hamilton", team: "Ferrari", color: "#E8002D" },
  LEC: { name: "Charles Leclerc", team: "Ferrari", color: "#E8002D" },
  VER: { name: "Max Verstappen", team: "Red Bull Racing", color: "#3671C6" },
  HAD: { name: "Isack Hadjar", team: "Red Bull Racing", color: "#3671C6" },
  PIA: { name: "Oscar Piastri", team: "McLaren", color: "#FF8000" },
  NOR: { name: "Lando Norris", team: "McLaren", color: "#FF8000" },
  ALO: { name: "Fernando Alonso", team: "Aston Martin", color: "#229971" },
  STR: { name: "Lance Stroll", team: "Aston Martin", color: "#229971" },
  GAS: { name: "Pierre Gasly", team: "Alpine", color: "#00A1E8" },
  COL: { name: "Franco Colapinto", team: "Alpine", color: "#00A1E8" },
  LAW: { name: "Liam Lawson", team: "Racing Bulls", color: "#6692FF" },
  LIN: { name: "Arvid Lindblad", team: "Racing Bulls", color: "#6692FF" },
  OCO: { name: "Esteban Ocon", team: "Haas", color: "#B6BABD" },
  BEA: { name: "Oliver Bearman", team: "Haas", color: "#B6BABD" },
  HUL: { name: "Nico Hulkenberg", team: "Audi", color: "#A7ADB1" },
  BOR: { name: "Gabriel Bortoleto", team: "Audi", color: "#A7ADB1" },
  SAI: { name: "Carlos Sainz", team: "Williams", color: "#1868DB" },
  ALB: { name: "Alex Albon", team: "Williams", color: "#1868DB" },
  PER: { name: "Sergio Perez", team: "Cadillac", color: "#AAAAAD" },
  BOT: { name: "Valtteri Bottas", team: "Cadillac", color: "#AAAAAD" }
};

export const DEFAULT_DRIVER_COLOR = "#6B7280";
