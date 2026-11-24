/*
 * Shared vocabularies: used by the website, the admin and the API worker so
 * that every list (categories, statuses, licensing answers...) has one source.
 */

export const CATEGORIES = {
  home: {
    label: 'Home-Based Business',
    short: 'Home-based',
    blurb: 'Run from home: home bakeries and Cottage Food, handmade products, candles and soaps, jewelry and accessories, arts and crafts, personalized gifts, small home-based producers and home-based services.'
  },
  micro: {
    label: 'Independent Micro-Business',
    short: 'Micro-business',
    blurb: 'Owner-operated without a conventional storefront: independent artisans, small workshops and studios, local makers and creators, appointment-based and pop-up businesses, independent service providers.'
  }
};

// What a business offers. `display` picks the illustrated goods on its stall.
export const KINDS = [
  { id: 'baked', label: 'Baked goods & sweets', display: 'bakery' },
  { id: 'preserves', label: 'Honey, jams & pantry', display: 'honey' },
  { id: 'candles', label: 'Candles & home fragrance', display: 'candles' },
  { id: 'soap', label: 'Soap & body care', display: 'soap' },
  { id: 'jewelry', label: 'Jewelry & accessories', display: 'jewelry' },
  { id: 'ceramics', label: 'Ceramics & pottery', display: 'ceramics' },
  { id: 'art', label: 'Art, prints & photography', display: 'art' },
  { id: 'textiles', label: 'Textiles, sewing & gifts', display: 'textiles' },
  { id: 'leather', label: 'Leather & woodwork', display: 'leather' },
  { id: 'plants', label: 'Plants & garden', display: 'plants' },
  { id: 'services', label: 'Services & classes', display: 'services' }
];
export const KIND_BY_ID = Object.fromEntries(KINDS.map((k) => [k.id, k]));

export const CITIES = ['Temecula', 'Murrieta', 'Menifee', 'Wildomar', 'Lake Elsinore', 'Fallbrook', 'De Luz', 'Aguanga', 'Other'];

export const LICENSE_OPTIONS = [
  { id: 'ready', label: 'Yes, I have the licenses and permits required for my activity.' },
  { id: 'unsure', label: 'I am not sure which licenses or permits I need.' },
  { id: 'started', label: 'I have started the process, but it is not completed.' },
  { id: 'not_started', label: 'I have not started the process yet.' },
  { id: 'not_required', label: 'I believe my activity does not require specific permits or licenses.' }
];

export const STATUSES = [
  { id: 'new', label: 'New Application' },
  { id: 'assistance', label: 'Assistance Requested' },
  { id: 'clarifying', label: 'Requirements Being Clarified' },
  { id: 'ready', label: 'Ready for Review' },
  { id: 'approved', label: 'Approved for Publication' },
  { id: 'not_eligible', label: 'Not Eligible' },
  { id: 'declined', label: 'Declined' }
];
export const STATUS_IDS = STATUSES.map((s) => s.id);

/** Status a new application starts in, from its licensing answers. */
export function initialStatus(licenseStatus, wantsHelp) {
  if (licenseStatus === 'ready' || licenseStatus === 'not_required') return 'new';
  return wantsHelp ? 'assistance' : 'clarifying';
}

// Stall looks the admin can choose from (awning stripes A, B, counter cloth)
export const STALL_PALETTES = [
  ['#C8902E', '#F2E6CC', '#7C4A2A'], ['#6F8A6A', '#EDE6D2', '#55704F'], ['#6B2D45', '#E9D9DC', '#3E2430'],
  ['#D9A23A', '#F4EAD0', '#9B6A1E'], ['#4E6E7E', '#E4E7E1', '#2F4954'], ['#A9798B', '#F1E6E6', '#7D5263'],
  ['#5C7F48', '#EEF0DE', '#3F5B33'], ['#8A5A3B', '#EADCC8', '#5E3B26'], ['#B5563F', '#F3E5D2', '#7E3A2A'],
  ['#3F5E8C', '#E6E8EE', '#2C4266']
];
export const ROOFS = ['awning', 'gable'];
export const VALANCES = ['scallop', 'fringe', 'points'];

/** URL-safe slug from a business name. */
export function slugify(name) {
  return String(name)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'business';
}

/** Default stall look for a new business, varied by its id. */
export function defaultStall(kindId, seedText = '') {
  let h = 0;
  for (const c of seedText) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const kind = KIND_BY_ID[kindId] || KINDS[0];
  return {
    display: kind.display,
    roof: ROOFS[h % 2],
    colors: STALL_PALETTES[h % STALL_PALETTES.length],
    valance: VALANCES[h % 3],
    chalk: ''
  };
}
