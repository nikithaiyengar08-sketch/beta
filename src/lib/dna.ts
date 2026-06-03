// Reader DNA — deterministic derivation from a user seed so previews feel real.
// Once `user_books`/`reviews` data is wired, replace `dnaForSeed` with a derivation
// over actual read history; the shape stays identical.

export type GenreSlice = { genre: string; pct: number; color: string };
export type DNAArchetype = {
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  color: string;
};
export type ReaderDNA = {
  archetype: DNAArchetype;
  genres: GenreSlice[];
  traits: { label: string; value: number }[]; // 0-100
  pace: "Slow burn" | "Steady" | "Sprinter" | "Marathoner";
  rereader: number; // 0-100
  moodArc: { mood: string; pct: number }[];
  era: { label: string; pct: number }[];
  format: { label: string; pct: number }[];
  signature: string; // short shareable line
};

const ARCHETYPES: DNAArchetype[] = [
  { name: "The Marginalia Mystic", tagline: "Reads with a pen, lives in the footnotes.", description: "You annotate everything. Books leave your hands looking lived-in.", emoji: "✍️", color: "rose" },
  { name: "The Nightstand Scholar", tagline: "Three open books, all chapter four.", description: "You read in parallel. Mood decides which book gets attention.", emoji: "📚", color: "burgundy" },
  { name: "The Highlight Hoarder", tagline: "Collects sentences like sea glass.", description: "Your quotes folder is bigger than most people's libraries.", emoji: "✨", color: "gold" },
  { name: "The Re-reader", tagline: "Knows when to come home.", description: "You return to books. Each pass finds something new.", emoji: "🔁", color: "lavender" },
  { name: "The Quiet Stack", tagline: "More books than time. Loves it.", description: "Your TBR is a personality trait. The pleasure is in the pile.", emoji: "🗂", color: "forest" },
  { name: "The Genre Wanderer", tagline: "Following the next interesting sentence.", description: "You jump between worlds. No two months look alike.", emoji: "🧭", color: "rose" },
  { name: "The Late-Night Drifter", tagline: "Best ideas arrive after midnight.", description: "Your reading happens when the house goes quiet.", emoji: "🌙", color: "lavender" },
  { name: "The Cover-to-Cover Loyalist", tagline: "One book at a time. To the end.", description: "You finish what you start. The bookmark moves in one direction.", emoji: "📖", color: "forest" },
];

const GENRES = [
  { g: "Literary Fiction", c: "rose" },
  { g: "Memoir", c: "gold" },
  { g: "Speculative", c: "lavender" },
  { g: "Historical Fiction", c: "burgundy" },
  { g: "Essay", c: "forest" },
  { g: "Contemporary", c: "rose" },
  { g: "Poetry", c: "gold" },
  { g: "Nonfiction", c: "lavender" },
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rand(seed: string, salt: string) {
  let x = hash(seed + ":" + salt);
  return () => {
    x = (x * 1664525 + 1013904223) | 0;
    return ((x >>> 0) % 10000) / 10000;
  };
}

export function dnaForSeed(seed: string): ReaderDNA {
  const r = rand(seed || "guest", "dna");
  const archetype = ARCHETYPES[Math.floor(r() * ARCHETYPES.length)];

  // pick 4-5 genres, weighted random
  const picks = [...GENRES].sort(() => r() - 0.5).slice(0, 5);
  const weights = picks.map(() => 5 + r() * 30);
  const total = weights.reduce((a, b) => a + b, 0);
  const genres = picks.map((p, i) => ({
    genre: p.g,
    pct: Math.round((weights[i] / total) * 100),
    color: p.c,
  })).sort((a, b) => b.pct - a.pct);

  const traits = [
    { label: "Plot-driven", value: Math.round(20 + r() * 80) },
    { label: "Sentence-loving", value: Math.round(20 + r() * 80) },
    { label: "Emotionally open", value: Math.round(20 + r() * 80) },
    { label: "Comfort-seeking", value: Math.round(20 + r() * 80) },
    { label: "Patient with slow openings", value: Math.round(20 + r() * 80) },
    { label: "Drawn to translated work", value: Math.round(10 + r() * 70) },
  ];

  const paces: ReaderDNA["pace"][] = ["Slow burn", "Steady", "Sprinter", "Marathoner"];
  const pace = paces[Math.floor(r() * paces.length)];

  const moods = ["Tender", "Restless", "Curious", "Quiet", "Defiant", "Wistful"];
  const moodPicks = [...moods].sort(() => r() - 0.5).slice(0, 4);
  const mw = moodPicks.map(() => 10 + r() * 30);
  const mt = mw.reduce((a, b) => a + b, 0);
  const moodArc = moodPicks.map((m, i) => ({ mood: m, pct: Math.round((mw[i] / mt) * 100) }));

  const eras = [
    { label: "Pre-1950", pct: 0 },
    { label: "1950–1999", pct: 0 },
    { label: "2000–2014", pct: 0 },
    { label: "2015–today", pct: 0 },
  ];
  const ew = eras.map(() => 5 + r() * 40);
  const et = ew.reduce((a, b) => a + b, 0);
  eras.forEach((e, i) => (e.pct = Math.round((ew[i] / et) * 100)));

  const formats = [
    { label: "Print", pct: 0 },
    { label: "Ebook", pct: 0 },
    { label: "Audio", pct: 0 },
  ];
  const fw = formats.map(() => 5 + r() * 40);
  const ft = fw.reduce((a, b) => a + b, 0);
  formats.forEach((f, i) => (f.pct = Math.round((fw[i] / ft) * 100)));

  const signature = `${archetype.emoji} ${archetype.name} · ${genres[0].genre} → ${genres[1].genre} · ${pace}`;

  return {
    archetype,
    genres,
    traits,
    pace,
    rereader: Math.round(r() * 100),
    moodArc,
    era: eras,
    format: formats,
    signature,
  };
}

// Compatibility — cosine similarity over weighted genre + trait vectors.
export function compatibility(a: ReaderDNA, b: ReaderDNA): {
  score: number;
  sharedGenres: string[];
  sharedTraits: string[];
  blurb: string;
} {
  const allGenres = Array.from(new Set([...a.genres, ...b.genres].map(g => g.genre)));
  const va = allGenres.map(g => a.genres.find(x => x.genre === g)?.pct ?? 0);
  const vb = allGenres.map(g => b.genres.find(x => x.genre === g)?.pct ?? 0);
  const dot = va.reduce((s, x, i) => s + x * vb[i], 0);
  const ma = Math.sqrt(va.reduce((s, x) => s + x * x, 0));
  const mb = Math.sqrt(vb.reduce((s, x) => s + x * x, 0));
  const genreSim = ma && mb ? dot / (ma * mb) : 0;

  const traitSim = 1 - (a.traits.reduce((s, t, i) => s + Math.abs(t.value - (b.traits[i]?.value ?? 0)), 0) / (a.traits.length * 100));

  const score = Math.round((genreSim * 0.65 + traitSim * 0.35) * 100);
  const sharedGenres = a.genres.filter(g => b.genres.some(x => x.genre === g.genre)).slice(0, 4).map(g => g.genre);
  const sharedTraits = a.traits
    .filter((t, i) => Math.abs(t.value - (b.traits[i]?.value ?? 0)) < 20)
    .map(t => t.label)
    .slice(0, 3);

  let blurb = "Different orbits.";
  if (score > 85) blurb = "Eerie twin readers. You'd love each other's shelves.";
  else if (score > 70) blurb = "Strong overlap — your TBRs would borrow from each other.";
  else if (score > 55) blurb = "Common ground with room to surprise each other.";
  else if (score > 40) blurb = "Adjacent tastes. Worth a swap or two.";

  return { score, sharedGenres, sharedTraits, blurb };
}

// Pick similar readers from a candidate set, sorted by compatibility.
export function similarReaders<T extends { id: string }>(
  me: ReaderDNA,
  candidates: T[],
  seedOf: (t: T) => string,
): { reader: T; dna: ReaderDNA; score: number; sharedGenres: string[] }[] {
  return candidates
    .map(c => {
      const dna = dnaForSeed(seedOf(c));
      const { score, sharedGenres } = compatibility(me, dna);
      return { reader: c, dna, score, sharedGenres };
    })
    .sort((a, b) => b.score - a.score);
}
