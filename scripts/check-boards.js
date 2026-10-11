const { http } = require('../lib/util');
const { BOARDS } = require('../lib/fetchers/greenhouse');
const { COMPANIES } = require('../lib/fetchers/lever');

function describeError(err) {
  return err.response?.status ? `HTTP ${err.response.status}` : err.message;
}

async function checkGreenhouse(board) {
  try {
    const { data } = await http.get(`https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs`);
    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
    const pune = jobs.filter((j) => /pune/i.test(j.location?.name || '')).length;
    return { ok: true, total: jobs.length, pune };
  } catch (err) {
    return { ok: false, reason: describeError(err) };
  }
}

async function checkLever(company) {
  try {
    const { data } = await http.get(`https://api.lever.co/v0/postings/${company.slug}`, {
      params: { mode: 'json' },
    });
    const postings = Array.isArray(data) ? data : [];
    const pune = postings.filter((p) => /pune/i.test(p.categories?.location || '')).length;
    return { ok: true, total: postings.length, pune };
  } catch (err) {
    return { ok: false, reason: describeError(err) };
  }
}

function printRow(label, result) {
  const status = result.ok
    ? `OK    total=${String(result.total).padStart(4)}  pune=${String(result.pune).padStart(3)}`
    : `FAIL  ${result.reason}`;
  console.log(`${label.padEnd(20)} ${status}`);
}

(async () => {
  console.log('Greenhouse');
  for (const board of BOARDS) {
    printRow(board.token, await checkGreenhouse(board));
  }

  console.log('\nLever');
  for (const company of COMPANIES) {
    printRow(company.slug, await checkLever(company));
  }

  console.log('\nOK means the board exists. pune=0 means it exists but has no Pune openings right now.');
  console.log('Remove the FAIL entries from lib/fetchers/greenhouse.js and lib/fetchers/lever.js.');
})();