const { http, isFresherCandidate, sanitizeHtml, toIsoDate, mapAllOrThrow } = require('../util');

// Lever company slugs. A slug that no longer exists is logged and skipped.
const COMPANIES = [
  { slug: 'zeta', name: 'Zeta' },
  { slug: 'cred', name: 'CRED' },
];

function formatSalary(range) {
  if (!range || range.min == null) return null;
  return `${range.currency || ''} ${range.min}-${range.max} ${range.interval || ''}`.replace(/\s+/g, ' ').trim();
}

async function fetchCompany(company) {
  const { data } = await http.get(`https://api.lever.co/v0/postings/${company.slug}`, {
    params: { mode: 'json' },
  });
  const postings = Array.isArray(data) ? data : [];

  return postings
    .filter((p) => {
      const locations = [p.categories?.location, ...(p.categories?.allLocations || [])].filter(Boolean).join(' ');
      return /pune/i.test(locations) || /pune/i.test(p.text || '');
    })
    .filter((p) => isFresherCandidate(p.text, [p.categories?.commitment]))
    .map((p) => ({
      title: p.text,
      company: company.name,
      location: p.categories?.location || 'Pune',
      source: 'lever',
      source_url: p.hostedUrl,
      apply_url: p.applyUrl || p.hostedUrl,
      description: sanitizeHtml(p.description || p.descriptionPlain || ''),
      salary: formatSalary(p.salaryRange),
      posted_at: toIsoDate(p.createdAt),
    }));
}

async function fetchLeverJobs() {
  return mapAllOrThrow(COMPANIES, 'lever', fetchCompany);
}

module.exports = { fetchLeverJobs, COMPANIES };
