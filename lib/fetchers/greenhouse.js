const { http, isFresherCandidate, decodeEntities, sanitizeHtml, toIsoDate, mapAllOrThrow } = require('../util');

// Greenhouse board tokens. A token that no longer exists is logged and skipped.
const BOARDS = [
  { token: 'mongodb', name: 'MongoDB' },
  { token: 'cloudflare', name: 'Cloudflare' },
  { token: 'airbnb', name: 'Airbnb' },
  { token: 'stripe', name: 'Stripe' },
  { token: 'datadog', name: 'Datadog' },
  { token: 'elastic', name: 'Elastic' },
  { token: 'twilio', name: 'Twilio' },
  { token: 'intercom', name: 'Intercom' },
  { token: 'contentful', name: 'Contentful' },
];

function metadataValues(meta) {
  return (meta || []).map((m) => (Array.isArray(m.value) ? m.value.join(' ') : String(m.value ?? '')));
}

async function fetchBoard(board) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`;
  const { data } = await http.get(url);
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

  return jobs
    .filter((job) => /pune/i.test(job.location?.name || ''))
    .filter((job) => isFresherCandidate(job.title, metadataValues(job.metadata)))
    .map((job) => ({
      title: job.title,
      company: board.name,
      location: job.location?.name || 'Pune',
      source: 'greenhouse',
      source_url: job.absolute_url,
      apply_url: job.absolute_url,
      description: sanitizeHtml(decodeEntities(job.content)),
      salary: null,
      posted_at: toIsoDate(job.updated_at),
    }));
}

async function fetchGreenhouseJobs() {
  return mapAllOrThrow(BOARDS, 'greenhouse', fetchBoard);
}

module.exports = { fetchGreenhouseJobs, BOARDS };
