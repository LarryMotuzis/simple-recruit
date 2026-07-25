const ON3_API = 'https://api.on3.com/public/rdb/v2/transfers/latest';
const SPORT_KEY = 2; // basketball

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://www.on3.com/',
};

// On3 internal status → display status
const STATUS_MAP: Record<string, string> = {
  Entered: 'Available',
  Expected: 'Available',
  Committed: 'Committed',
  Enrolled: 'Enrolled',
  Withdrawn: 'Withdrawn',
};

interface On3Entry {
  player?: {
    key?: number;
    fullName?: string;
    slug?: string;
    position?: { abbr?: string };
    height?: string;
    classRank?: string;
  };
  organization?: { name?: string };
  status?: {
    type?: string;
    committedAsset?: { name?: string };
    transferEntered?: string;
  };
  transferRating?: { stars?: number };
  rosterRating?: { stars?: number };
}

interface On3ApiResponse {
  list?: On3Entry[];
  pagination?: { pageCount?: number };
}

export interface PortalEntry {
  on3Key?: number;
  fullName: string;
  slug: string | null;
  positionAbbr: string | null;
  height: string | null;
  classRank: string | null;
  fromSchool: string | null;
  toSchool: string | null;
  status: string;
  stars: number | null;
  portalEnteredAt: string | null;
}

export interface ScrapeOptions {
  year?: number;
  status?: string;
  maxPages?: number;
}

/**
 * Fetch all currently-available basketball transfer portal entries from On3.
 * Uses the direct JSON API (no HTML scraping). Paginates through all pages.
 */
export async function scrapeOn3Portal({
  year = new Date().getFullYear(),
  status = 'Entered',
  maxPages = 20,
}: ScrapeOptions = {}): Promise<PortalEntry[]> {
  const entries: PortalEntry[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      sportKey: String(SPORT_KEY),
      year: String(year),
      page: String(page),
      limit: '50',
      ...(status ? { status } : {}),
    });

    const res = await fetch(`${ON3_API}?${params}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`On3 API returned ${res.status} on page ${page}`);

    const data = (await res.json()) as On3ApiResponse;
    const list = data?.list;
    if (!Array.isArray(list)) throw new Error('Unexpected On3 API response shape');

    for (const entry of list) {
      entries.push(normalizeEntry(entry));
    }

    totalPages = Math.min(data?.pagination?.pageCount ?? 1, maxPages);
    page++;
  } while (page <= totalPages);

  return entries;
}

function normalizeEntry(entry: On3Entry): PortalEntry {
  const player = entry.player ?? {};
  const status = entry.status ?? {};

  return {
    on3Key: player.key,
    fullName: player.fullName ?? 'Unknown',
    slug: player.slug ?? null,
    positionAbbr: player.position?.abbr ?? null,
    height: player.height ?? null,
    classRank: player.classRank ?? null,
    fromSchool: entry.organization?.name ?? null,
    toSchool: status.committedAsset?.name ?? null,
    status: (status.type ? STATUS_MAP[status.type] : undefined) ?? status.type ?? 'Unknown',
    stars: entry.transferRating?.stars ?? entry.rosterRating?.stars ?? null,
    portalEnteredAt: status.transferEntered ?? null,
  };
}
