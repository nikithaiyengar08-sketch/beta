import { supabase } from "@/integrations/supabase/client";

export interface OLBook {
  ol_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  isbn: string | null;
  published_year: number | null;
}

export async function searchOpenLibrary(q: string): Promise<OLBook[]> {
  if (!q.trim()) return [];
  const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,isbn`);
  const data = await res.json();
  return (data.docs ?? []).map((d: any) => ({
    ol_id: d.key,
    title: d.title,
    author: (d.author_name && d.author_name[0]) || "Unknown",
    cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    isbn: (d.isbn && d.isbn[0]) || null,
    published_year: d.first_publish_year ?? null,
  }));
}

/** Upsert a book and return its id */
export async function ensureBook(b: OLBook): Promise<string> {
  const { data: existing } = await supabase.from("books").select("id").eq("ol_id", b.ol_id).maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await supabase
    .from("books")
    .insert({
      ol_id: b.ol_id,
      title: b.title,
      author: b.author,
      cover_url: b.cover_url,
      isbn: b.isbn,
      published_year: b.published_year,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

const FIELDS = "key,title,author_name,cover_i,isbn,number_of_pages_median,first_publish_year,subject,ratings_average,ratings_count,language,edition_count";

const SUBJECTS = [
  // Literary fiction & classics
  "literary-fiction","classics","contemporary-fiction","american-literature","english-literature",
  "world-literature","modernist-literature","postmodern-fiction","southern-gothic","magical-realism",
  "latin-american-literature","japanese-literature","russian-literature","french-literature","german-literature",
  "african-literature","chinese-literature","indian-literature","irish-literature","scandinavian-literature",
  "italian-literature","spanish-literature",
  // Genre fiction
  "science-fiction","fantasy","mystery","thriller","horror","romance","historical-fiction","adventure","western",
  "crime-fiction","detective-fiction","spy-fiction","legal-thriller","medical-thriller","psychological-thriller",
  "cozy-mystery","noir","gothic-fiction","cyberpunk","steampunk","space-opera","epic-fantasy","urban-fantasy",
  "dark-fantasy","paranormal-romance","dystopian-fiction","post-apocalyptic-fiction","alternate-history",
  "military-fiction","political-fiction",
  // Non-fiction
  "biography","autobiography","memoir","history","world-history","american-history","ancient-history",
  "medieval-history","military-history","science","physics","biology","chemistry","astronomy","mathematics",
  "medicine","technology","computer-science","artificial-intelligence","philosophy","ethics","logic",
  "psychology","psychiatry","sociology","anthropology","economics","business","entrepreneurship","self-help",
  "personal-development","mindfulness","spirituality","religion","theology","politics","political-science",
  "international-relations","law","journalism","true-crime","nature","ecology","environment","travel","food",
  "cooking","art","music","film","architecture","design","photography","sports","fitness","health","parenting",
  "education","linguistics","language",
  // Poetry & short form
  "poetry","american-poetry","british-poetry","lyric-poetry","epic-poetry","short-stories","anthologies",
  "essays","letters","diaries","speeches",
  // Audience
  "young-adult","middle-grade","children","picture-books","graphic-novels","comics","manga","new-adult",
  // Era
  "ancient-literature","medieval-literature","renaissance-literature","victorian-literature",
  "edwardian-literature","beat-generation","harlem-renaissance","lost-generation",
  // Theme
  "coming-of-age","family","love","war","identity","race","gender","feminism","lgbtq","immigration","diaspora",
  "grief","addiction","mental-health","social-justice","colonialism","slavery","freedom","survival","redemption",
  "friendship","betrayal","power","corruption","nature-writing","place-and-belonging","class-and-society",
];

const KEYWORDS = [
  "booker prize winner","pulitzer prize fiction","national book award","man booker prize","nobel prize literature",
  "womens prize fiction","costa book award","edgar award mystery","hugo award science fiction","nebula award",
  "world fantasy award","bram stoker award","new york times bestseller","oprah book club","reese book club",
  "barack obama reading list","bill gates recommended books","100 books everyone should read",
  "best novels 21st century","best novels 20th century","best debut novel","best first novel","banned books",
  "challenged books","controversial books","translated fiction","books in translation","international fiction",
  "short story collection","essay collection","narrative nonfiction","longform journalism","new yorker fiction",
  "paris review fiction",
];

const AUTHORS = [
  "Stephen King","Agatha Christie","James Patterson","Nora Roberts","John Grisham","Danielle Steel",
  "Dean Koontz","Terry Pratchett","Brandon Sanderson","George R.R. Martin","J.R.R. Tolkien","J.K. Rowling",
  "Ursula Le Guin","Isaac Asimov","Philip K Dick","Ray Bradbury","Kurt Vonnegut","Ernest Hemingway",
  "F. Scott Fitzgerald","William Faulkner","Toni Morrison","Maya Angelou","Zadie Smith",
  "Chimamanda Ngozi Adichie","Haruki Murakami","Gabriel Garcia Marquez","Dostoevsky","Tolstoy","Chekhov",
  "Kafka","Camus","Sartre","Simone de Beauvoir","Virginia Woolf","James Joyce","Samuel Beckett","Oscar Wilde",
  "Charles Dickens","Jane Austen","George Eliot","Thomas Hardy","DH Lawrence","EM Forster","Aldous Huxley",
  "George Orwell","Graham Greene","Evelyn Waugh","Patrick White","Nadine Gordimer","VS Naipaul",
  "Salman Rushdie","Arundhati Roy","Kazuo Ishiguro","Ian McEwan","Julian Barnes","Martin Amis","Nick Hornby",
  "David Mitchell","Ali Smith","Hilary Mantel","Colm Toibin","Sebastian Barry","Anne Enright","Sally Rooney",
  "Paul Auster","Don DeLillo","Cormac McCarthy","Philip Roth","Saul Bellow","John Updike","John Irving",
  "Joyce Carol Oates","Donna Tartt","Jeffrey Eugenides","Jonathan Franzen","David Foster Wallace",
  "Denis Johnson","Richard Powers","Annie Proulx","Barbara Kingsolver","Marilynne Robinson","Colson Whitehead",
  "Ta-Nehisi Coates","Ocean Vuong","Roxane Gay","Ottessa Moshfegh","Rachel Cusk","Jenny Offill",
  "Maggie Nelson","Carmen Maria Machado","George Saunders","Lydia Davis","Jhumpa Lahiri","Mohsin Hamid",
  "Yaa Gyasi","Min Jin Lee","Celeste Ng","Anthony Doerr","Hanya Yanagihara","Andrew Sean Greer",
  "Paul Murray","Richard Osman","Matt Haig","Olga Tokarczuk","Han Kang","Elena Ferrante","Roberto Bolano",
  "Jorge Luis Borges","Julio Cortazar","Isabel Allende","Mario Vargas Llosa","Paulo Coelho",
  "Clarice Lispector","Machado de Assis","Naguib Mahfouz","Chinua Achebe","Ngugi wa Thiong'o","Wole Soyinka",
  "Ben Okri","Petina Gappah","Patrick Rothfuss","Robin Hobb","Joe Abercrombie","N.K. Jemisin","Ken Liu",
  "Ted Chiang","Andy Weir","Blake Crouch","Gillian Flynn","Tana French","Kate Atkinson","Val McDermid",
  "Ian Rankin","Lee Child","Michael Connelly","Donna Leon","Andrea Camilleri","Fred Vargas","Stieg Larsson",
  "Jo Nesbo","Camilla Lackberg",
];

const TRENDING_URLS = [
  "https://openlibrary.org/trending/weekly.json?limit=100",
  "https://openlibrary.org/trending/daily.json?limit=100",
  "https://openlibrary.org/trending/monthly.json?limit=100",
  "https://openlibrary.org/trending/yearly.json?limit=100",
  "https://openlibrary.org/trending/forever.json?limit=100",
  `https://openlibrary.org/search.json?q=bestseller&sort=rating&limit=100&fields=${FIELDS}`,
  `https://openlibrary.org/search.json?q=${encodeURIComponent("must read")}&sort=rating&limit=100&fields=${FIELDS}`,
  `https://openlibrary.org/search.json?q=${encodeURIComponent("classic novel")}&sort=rating&limit=100&fields=${FIELDS}`,
  `https://openlibrary.org/search.json?q=${encodeURIComponent("debut novel award")}&sort=rating&limit=100&fields=${FIELDS}`,
  `https://openlibrary.org/search.json?q=${encodeURIComponent("reading list")}&sort=rating&limit=100&fields=${FIELDS}`,
];

const DECADES: Array<[number, number]> = [
  [1800,1849],[1850,1899],[1900,1909],[1910,1919],[1920,1929],[1930,1939],[1940,1949],
  [1950,1959],[1960,1969],[1970,1979],[1980,1989],[1990,1999],[2000,2009],[2010,2019],[2020,2026],
];

const SEED_QUOTES = [
  { text: "It does not do to dwell on dreams and forget to live.", author: "J.K. Rowling", book_title: "Harry Potter and the Philosopher's Stone" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien", book_title: "The Fellowship of the Ring" },
  { text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", author: "Jane Austen", book_title: "Pride and Prejudice" },
  { text: "The only way out of the labyrinth of suffering is to forgive.", author: "John Green", book_title: "Looking for Alaska" },
  { text: "We accept the love we think we deserve.", author: "Stephen Chbosky", book_title: "The Perks of Being a Wallflower" },
  { text: "So it goes.", author: "Kurt Vonnegut", book_title: "Slaughterhouse-Five" },
  { text: "It was the best of times, it was the worst of times.", author: "Charles Dickens", book_title: "A Tale of Two Cities" },
  { text: "I am not afraid of storms, for I am learning how to sail my ship.", author: "Louisa May Alcott", book_title: "Little Women" },
  { text: "I took a deep breath and listened to the old brag of my heart: I am, I am, I am.", author: "Sylvia Plath", book_title: "The Bell Jar" },
  { text: "Maybe stories are just data with a soul.", author: "Brené Brown", book_title: "Daring Greatly" },
  { text: "We are all just walking each other home.", author: "Ram Dass", book_title: "Be Here Now" },
  { text: "Tell me, what is it you plan to do with your one wild and precious life?", author: "Mary Oliver", book_title: "The Summer Day" },
  { text: "She had read too many books, which had spoiled her for everyday life.", author: "Sylvia Plath", book_title: "The Bell Jar" },
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin", book_title: "A Dance with Dragons" },
  { text: "To live is the rarest thing in the world. Most people exist, that is all.", author: "Oscar Wilde", book_title: "The Soul of Man Under Socialism" },
  { text: "And, when you want something, all the universe conspires in helping you to achieve it.", author: "Paulo Coelho", book_title: "The Alchemist" },
  { text: "It is nothing to die. It is frightful not to live.", author: "Victor Hugo", book_title: "Les Misérables" },
  { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway", book_title: "A Farewell to Arms" },
  { text: "The world is a book and those who do not travel read only one page.", author: "Saint Augustine", book_title: "Confessions" },
  { text: "I am not what happened to me, I am what I choose to become.", author: "Carl Jung", book_title: "Modern Man in Search of a Soul" },
  { text: "You have brains in your head. You have feet in your shoes.", author: "Dr. Seuss", book_title: "Oh, the Places You'll Go!" },
  { text: "Do I dare disturb the universe?", author: "T.S. Eliot", book_title: "The Love Song of J. Alfred Prufrock" },
  { text: "It is our choices that show what we truly are, far more than our abilities.", author: "J.K. Rowling", book_title: "Harry Potter and the Chamber of Secrets" },
  { text: "We need never be hopeless, because we can never be irreparably broken.", author: "John Green", book_title: "Looking for Alaska" },
  { text: "One must always be careful of books, and what is inside them, for words have the power to change us.", author: "Cassandra Clare", book_title: "City of Bones" },
  { text: "The human heart is the first home of democracy.", author: "Terry Tempest Williams", book_title: "When Women Were Birds" },
  { text: "Call me Ishmael.", author: "Herman Melville", book_title: "Moby Dick" },
  { text: "I am so clever that sometimes I don't understand a single word of what I am saying.", author: "Oscar Wilde", book_title: "The Happy Prince" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien", book_title: "The Fellowship of the Ring" },
  { text: "She was a girl who knew how to be happy even when she was sad. And that's important.", author: "Marilyn Monroe", book_title: "My Story" },
];

function mapDoc(d: any) {
  const ol_id = (d.key ?? "").replace(/^\/works\//, "");
  if (!ol_id || !ol_id.startsWith("OL")) return null;
  const title = d.title;
  if (!title || typeof title !== "string" || title.trim().length < 2) return null;
  if (/^\d+$/.test(title.trim())) return null;
  return {
    ol_id,
    title,
    author: d.author_name?.[0] ?? d.authors?.[0]?.name ?? null,
    cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    isbn: d.isbn?.[0] ?? null,
    page_count: d.number_of_pages_median ?? null,
    published_year: d.first_publish_year ?? null,
    genres: d.subject?.slice(0, 8) ?? null,
    ratings_average: d.ratings_average ?? null,
    ratings_count: d.ratings_count ?? null,
  };
}

/** Rate-limited fetch queue: max 2 concurrent, 400ms gap, retry once on 429. */
async function fetchQueue(urls: string[]): Promise<(any | null)[]> {
  const results: (any | null)[] = new Array(urls.length).fill(null);
  let next = 0;
  let lastStart = 0;
  const MIN_GAP = 400;
  const CONCURRENCY = 2;

  async function fetchOne(url: string): Promise<any | null> {
    const tryFetch = async (): Promise<any | null> => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (res.status === 429) return "RATE_LIMIT";
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      } finally { clearTimeout(t); }
    };
    const first = await tryFetch();
    if (first === "RATE_LIMIT") {
      await new Promise(r => setTimeout(r, 3000));
      const second = await tryFetch();
      return second === "RATE_LIMIT" ? null : second;
    }
    return first;
  }

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= urls.length) return;
      const wait = Math.max(0, MIN_GAP - (Date.now() - lastStart));
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      lastStart = Date.now();
      try {
        results[i] = await fetchOne(urls[i]);
      } catch {
        results[i] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return results;
}

function mountPill(): { update: (n: number) => void; done: (total: number) => void } {
  if (typeof document === "undefined") {
    return { update: () => {}, done: () => {} };
  }
  const pill = document.createElement("div");
  pill.style.cssText = [
    "position:fixed","bottom:24px","right:24px","z-index:9999",
    "background:var(--foreground)","color:var(--background)",
    "font-size:12px","padding:8px 16px","border-radius:99px",
    "box-shadow:0 4px 20px rgba(0,0,0,0.18)","transition:opacity 0.6s ease",
    "font-family:system-ui,-apple-system,sans-serif","opacity:1",
  ].join(";");
  pill.textContent = "📚 Building library… 0 books";
  document.body.appendChild(pill);
  return {
    update: (n: number) => { pill.textContent = `📚 Building library… ${n.toLocaleString()} books`; },
    done: (total: number) => {
      pill.textContent = `✓ ${total.toLocaleString()} books ready`;
      setTimeout(() => { pill.style.opacity = "0"; }, 4000);
      setTimeout(() => { try { pill.remove(); } catch {} }, 4800);
    },
  };
}

async function seedQuotesIfEmpty() {
  try {
    const { count } = await supabase.from("quotes").select("*", { count: "exact", head: true });
    if ((count ?? 0) >= 10) return;
    const rows = SEED_QUOTES.map(q => ({ ...q, user_id: null }));
    await supabase.from("quotes").insert(rows);
  } catch { /* ignore */ }
}

export async function seedCatalog() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("folio_catalog_v3") === "1") return;

  // Fire-and-forget quotes seed in parallel
  seedQuotesIfEmpty();

  // Build URL list
  const urls: string[] = [];
  // Phase 1 — subjects, 8 pages
  console.log("Starting Phase 1: subject searches…");
  for (const s of SUBJECTS) {
    for (let p = 1; p <= 8; p++) {
      urls.push(`https://openlibrary.org/search.json?subject=${encodeURIComponent(s)}&sort=rating&limit=100&page=${p}&fields=${FIELDS}`);
    }
  }
  // Phase 2 — keywords, 5 pages
  for (const k of KEYWORDS) {
    for (let p = 1; p <= 5; p++) {
      urls.push(`https://openlibrary.org/search.json?q=${encodeURIComponent(k)}&sort=rating&limit=100&page=${p}&fields=${FIELDS}`);
    }
  }
  // Phase 3 — authors, 3 pages
  for (const a of AUTHORS) {
    for (let p = 1; p <= 3; p++) {
      urls.push(`https://openlibrary.org/search.json?author=${encodeURIComponent(a)}&sort=rating&limit=100&page=${p}&fields=${FIELDS}`);
    }
  }
  // Phase 4 — trending & curated
  urls.push(...TRENDING_URLS);
  // Phase 5 — decade sweeps, 4 pages
  for (const [start, end] of DECADES) {
    for (let p = 1; p <= 4; p++) {
      urls.push(`https://openlibrary.org/search.json?first_publish_year=[${start}+TO+${end}]&sort=rating&limit=100&page=${p}&fields=${FIELDS}`);
    }
  }

  console.log(`📚 Starting catalog import: ${urls.length} URLs`);
  const pill = mountPill();

  const seen = new Set<string>();
  const insertBuffer: any[] = [];
  let insertedCount = 0;
  let lastLog = 0;
  let pendingUpserts: Promise<unknown>[] = [];
  const MAX_CONCURRENT_UPSERTS = 5;

  const flush = async (batch: any[]) => {
    // throttle to 5 concurrent
    if (pendingUpserts.length >= MAX_CONCURRENT_UPSERTS) {
      try { await Promise.race(pendingUpserts); } catch {}
    }
    const p = (supabase
      .from("books")
      .upsert(batch, { onConflict: "ol_id", ignoreDuplicates: true }) as unknown as Promise<unknown>)
      .then(() => {
        insertedCount += batch.length;
        pill.update(insertedCount);
        if (insertedCount - lastLog >= 500) {
          lastLog = insertedCount;
          console.log(`📚 ${insertedCount} books inserted so far…`);
        }
      })
      .catch(() => {})
      .finally(() => {
        pendingUpserts = pendingUpserts.filter(x => x !== p);
      });
    pendingUpserts.push(p);
  };

  // We fetch and process incrementally by chunking the URL list so we can flush
  // as data arrives instead of holding all responses in memory.
  const CHUNK = 40;
  try {
    for (let i = 0; i < urls.length; i += CHUNK) {
      const chunk = urls.slice(i, i + CHUNK);
      const results = await fetchQueue(chunk);
      for (const r of results) {
        if (!r) continue;
        const docs: any[] = r.docs ?? r.works ?? [];
        for (const d of docs) {
          const doc = d.work ?? d; // trending works wrap under .work
          const m = mapDoc(doc);
          if (!m) continue;
          if (seen.has(m.ol_id)) continue;
          seen.add(m.ol_id);
          insertBuffer.push(m);
          if (insertBuffer.length >= 100) {
            const batch = insertBuffer.splice(0, 100);
            await flush(batch);
          }
        }
      }
    }
    // Flush remainder
    if (insertBuffer.length > 0) {
      await flush(insertBuffer.splice(0));
    }
    // Wait for all pending upserts
    try { await Promise.all(pendingUpserts); } catch {}
    console.log(`✅ Catalog complete: ${insertedCount} books total`);
    pill.done(insertedCount);
    localStorage.setItem("folio_catalog_v3", "1");
  } catch (e) {
    console.warn("seedCatalog failed", e);
    pill.done(insertedCount);
  }
}
