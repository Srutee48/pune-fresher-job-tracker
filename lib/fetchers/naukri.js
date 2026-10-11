const { http, sanitizeHtml, toIsoDate } = require('../util');

const SEARCH_URL =
  'https://www.naukri.com/jobapi/v3/search?noOfResults=20&urlType=search_by_keyword&searchType=adv&keyword=fresher&location=pune';

const REQUEST_HEADERS = {
  Accept: 'application/json',
  appid: '109',
  systemid: '109',
  Referer: 'https://www.naukri.com/fresher-jobs-in-pune',
};

function placeholder(list, type) {
  return (list || []).find((p) => p.type === type)?.label || null;
}

// Best-effort. Naukri often blocks non-browser clients; any failure is rethrown with
// a short reason so the pipeline can log it and continue.
async function fetchNaukriJobs() {
  let data;
  try {
    ({ data } = await http.get(SEARCH_URL, { headers: REQUEST_HEADERS }));
  } catch (err) {
    const reason = err.response?.status ? `HTTP ${err.response.status}` : err.message;
    throw new Error(`Naukri unavailable (${reason})`);
  }

  const items = Array.isArray(data?.jobDetails) ? data.jobDetails : [];

  return items
    .filter((job) => job.title && job.jdURL)
    .map((job) => {
      const url = new URL(job.jdURL, 'https://www.naukri.com').href;
      return {
        title: job.title,
        company: job.companyName || 'Unknown company',
        location: placeholder(job.placeholders, 'location') || 'Pune',
        source: 'naukri',
        source_url: url,
        apply_url: url,
        description: sanitizeHtml(job.jobDescription || ''),
        salary: placeholder(job.placeholders, 'salary'),
        posted_at: toIsoDate(job.createdDate),
      };
    });
}

module.exports = { fetchNaukriJobs };
