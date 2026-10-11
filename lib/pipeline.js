const db = require('../db');
const { fetchGreenhouseJobs } = require('./fetchers/greenhouse');
const { fetchLeverJobs } = require('./fetchers/lever');
const { fetchInternshalaJobs } = require('./fetchers/internshala');
const { fetchNaukriJobs } = require('./fetchers/naukri');
const { isComputerScienceJob } = require('./util');

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

const SOURCES = [
  { name: 'greenhouse', run: fetchGreenhouseJobs },
  { name: 'lever', run: fetchLeverJobs },
  { name: 'internshala', run: fetchInternshalaJobs },
  { name: 'naukri', run: fetchNaukriJobs },
];

const insertJob = db.prepare(`
  INSERT OR IGNORE INTO jobs
    (title, company, location, source, source_url, apply_url, description, salary, posted_at, first_seen_at, is_active)
  VALUES
    (@title, @company, @location, @source, @source_url, @apply_url, @description, @salary, @posted_at, @first_seen_at, 1)
`);

const insertLog = db.prepare(`
  INSERT INTO fetch_logs (source, fetched_at, jobs_found, jobs_added, status, error)
  VALUES (@source, @fetched_at, @jobs_found, @jobs_added, @status, @error)
`);

const deactivateStale = db.prepare(`
  UPDATE jobs SET is_active = 0 WHERE is_active = 1 AND first_seen_at < @cutoff
`);

// Inserts jobs, skipping any whose source_url already exists. Returns the number actually added.
function saveJobs(jobs) {
  const now = new Date().toISOString();
  const valid = (jobs || []).filter(
  (j) => j && j.title && j.company && j.source && j.source_url && isComputerScienceJob(j.title)
  );

  const save = db.transaction((list) => {
    let added = 0;
    for (const job of list) {
      const info = insertJob.run({
        title: job.title,
        company: job.company,
        location: job.location ?? null,
        source: job.source,
        source_url: job.source_url,
        apply_url: job.apply_url ?? job.source_url,
        description: job.description ?? null,
        salary: job.salary ?? null,
        posted_at: job.posted_at ?? null,
        first_seen_at: now,
      });
      added += info.changes;
    }
    return added;
  });

  return save(valid);
}

// Marks jobs first seen more than 30 days ago as inactive. Returns how many changed.
function markStaleJobsInactive() {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  return deactivateStale.run({ cutoff }).changes;
}

let running = false;

// Runs each source in order. A failing source is logged and the next one still runs.
async function runAllFetchers() {
  if (running) {
    console.log('[pipeline] a fetch is already running, skipping this run');
    return null;
  }
  running = true;

  const sources = [];
  try {
    for (const source of SOURCES) {
      const log = {
        source: source.name,
        fetched_at: new Date().toISOString(),
        jobs_found: 0,
        jobs_added: 0,
        status: 'ok',
        error: null,
      };

      try {
        const jobs = await source.run();
        log.jobs_found = jobs.length;
        log.jobs_added = saveJobs(jobs);
      } catch (err) {
        log.status = 'error';
        log.error = err.message;
        console.error(`[pipeline] ${source.name} failed: ${err.message}`);
      }

      insertLog.run(log);
      sources.push(log);
      console.log(`[pipeline] ${source.name}: found ${log.jobs_found}, added ${log.jobs_added} (${log.status})`);
    }

    const deactivated = markStaleJobsInactive();
    return { sources, deactivated };
  } finally {
    running = false;
  }
}

module.exports = { runAllFetchers, saveJobs, markStaleJobsInactive };
