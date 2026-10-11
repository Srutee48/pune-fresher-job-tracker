const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { escapeHtml } = require('../lib/util');

const router = express.Router();

const SOURCES = ['greenhouse', 'lever', 'internshala', 'naukri', 'seed', 'manual'];

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function notFound(res, message = 'That job does not exist.') {
  return res.status(404).render('error', { title: 'Not found', message });
}

router.get('/', (req, res) => {
  const q = String(req.query.q || '').trim();
  const source = SOURCES.includes(req.query.source) ? req.query.source : '';
  const activeOnly = req.query.active === '1';
  const sort = req.query.sort === 'first_seen' ? 'first_seen' : 'posted';

  const where = [];
  const params = {};
  if (q) {
    where.push('(title LIKE @q OR company LIKE @q)');
    params.q = `%${q}%`;
  }
  if (source) {
    where.push('source = @source');
    params.source = source;
  }
  if (activeOnly) where.push('is_active = 1');

  const orderBy = sort === 'first_seen' ? 'first_seen_at DESC' : 'COALESCE(posted_at, first_seen_at) DESC';
  const sql = `
    SELECT * FROM jobs
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${orderBy}, id DESC`;

  const jobs = db.prepare(sql).all(params);
  res.render('index', {
    title: 'Jobs',
    jobs,
    sources: SOURCES,
    filters: { q, source, activeOnly, sort },
  });
});

router.get('/job/:id', (req, res) => {
  const id = parseId(req.params.id);
  const job = id && db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!job) return notFound(res);
  res.render('detail', { title: job.title, job });
});

function setActive(value) {
  return (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return notFound(res);
    const info = db.prepare('UPDATE jobs SET is_active = ? WHERE id = ?').run(value, id);
    if (!info.changes) return notFound(res);
    res.redirect(`/job/${id}`);
  };
}

router.post('/job/:id/deactivate', setActive(0));
router.post('/job/:id/activate', setActive(1));

router.get('/stats', (req, res) => {
  const totals = db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(is_active), 0) AS active FROM jobs').get();

  const sourceRows = db
    .prepare('SELECT source, COUNT(*) AS count FROM jobs GROUP BY source ORDER BY count DESC')
    .all();
  const maxSource = Math.max(1, ...sourceRows.map((r) => r.count));
  const bySource = sourceRows.map((r) => ({ ...r, pct: Math.round((r.count / maxSource) * 100) }));

  // The last 14 UTC days, oldest first. Days with no jobs still appear as empty bars.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayKeys = [];
  for (let i = 13; i >= 0; i -= 1) {
    dayKeys.push(new Date(today.getTime() - i * 864e5).toISOString().slice(0, 10));
  }

  const rows = db
    .prepare('SELECT substr(first_seen_at, 1, 10) AS day, COUNT(*) AS count FROM jobs WHERE first_seen_at >= @since GROUP BY day')
    .all({ since: dayKeys[0] });
  const counts = new Map(rows.map((r) => [r.day, r.count]));
  const maxDay = Math.max(1, ...dayKeys.map((k) => counts.get(k) || 0));
  const days = dayKeys.map((key) => {
    const count = counts.get(key) || 0;
    return { day: key, label: key.slice(5), count, pct: Math.round((count / maxDay) * 100) };
  });

  res.render('stats', { title: 'Stats', totals, bySource, days });
});

router.get('/add', (req, res) => {
  res.render('add', { title: 'Add job', errors: [], values: {} });
});

router.post('/add', (req, res) => {
  const field = (name) => String(req.body[name] || '').trim();
  const values = {
    title: field('title'),
    company: field('company'),
    location: field('location'),
    salary: field('salary'),
    apply_url: field('apply_url'),
    description: field('description'),
  };

  const errors = [];
  if (!values.title) errors.push('Job title is required.');
  if (!values.company) errors.push('Company is required.');
  if (values.apply_url && !/^https?:\/\//i.test(values.apply_url)) {
    errors.push('Apply link must start with http:// or https://.');
  }
  if (errors.length) {
    return res.status(400).render('add', { title: 'Add job', errors, values });
  }

  const description = values.description
    ? escapeHtml(values.description).replace(/\r?\n/g, '<br>')
    : null;

  const info = db
    .prepare(`
      INSERT INTO jobs (title, company, location, source, source_url, apply_url, description, salary, posted_at, first_seen_at, is_active)
      VALUES (@title, @company, @location, 'manual', @source_url, @apply_url, @description, @salary, NULL, @first_seen_at, 1)
    `)
    .run({
      title: values.title,
      company: values.company,
      location: values.location || null,
      source_url: `manual:${crypto.randomUUID()}`,
      apply_url: values.apply_url || null,
      description,
      salary: values.salary || null,
      first_seen_at: new Date().toISOString(),
    });

  res.redirect(`/job/${info.lastInsertRowid}`);
});

module.exports = router;
