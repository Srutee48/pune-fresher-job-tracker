const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const http = axios.create({
  timeout: 15000,
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, text/html;q=0.9' },
});

// Title signals for early-career roles (from the assignment spec).
const FRESHER_TITLE = /fresher|graduate|entry.level|intern|trainee|junior|0-1|0\s*-\s*1/i;
const SENIOR_TITLE = /\b(senior|sr|lead|principal|staff|manager|director|architect|head)\b/i;

// Keep a job when it has an entry-level signal, or when we cannot tell
// (no entry-level signal and no clearly senior title). Only clearly senior
// roles are dropped. False positives are acceptable for this demo.
function isFresherCandidate(title = '', signals = []) {
  if (FRESHER_TITLE.test(title || '')) return true;
  if (signals.some((s) => FRESHER_TITLE.test(s || ''))) return true;
  return !SENIOR_TITLE.test(title || '');
}

// Greenhouse returns HTML that is entity-escaped (&lt;p&gt;...). Decode it to real HTML.
function decodeEntities(value) {
  if (!value) return '';
  return cheerio.load(String(value), {}, false).root().text();
}

// Remove scripts, iframes and event handlers from third-party HTML before rendering it.
function sanitizeHtml(html) {
  if (!html) return null;
  const $ = cheerio.load(html, {}, false);
  $('script, style, iframe, object, embed, link, meta, form, svg').remove();
  $('*').each((_, el) => {
    for (const name of Object.keys(el.attribs || {})) {
      const value = el.attribs[name] || '';
      const isEventHandler = name.toLowerCase().startsWith('on');
      const isJsUrl = /^(href|src|xlink:href)$/i.test(name) && /^\s*javascript:/i.test(value);
      if (isEventHandler || isJsUrl) $(el).removeAttr(name);
    }
  });
  return $.root().html();
}

function toIsoDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Converts strings like "3 days ago" or "Posted today" into an ISO timestamp.
function parseRelativeDate(text) {
  if (!text) return null;
  if (/today|just now/i.test(text)) return new Date().toISOString();
  const match = /(\d+)\s*(minute|hour|day|week|month)s?\s*ago/i.exec(text);
  if (!match) return null;
  const unitMs = { minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6 };
  const ms = Number(match[1]) * unitMs[match[2].toLowerCase()];
  return new Date(Date.now() - ms).toISOString();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Runs fn for every item. Individual failures are logged and skipped.
// Throws only when every item failed, so the source is recorded as an error.
async function mapAllOrThrow(items, label, fn) {
  let failed = 0;
  let lastError = null;
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        return await fn(item);
      } catch (err) {
        failed += 1;
        lastError = err;
        const name = item?.name || item?.slug || item?.token || String(item);
        console.warn(`[${label}] ${name} skipped: ${err.message}`);
        return [];
      }
    })
  );
  if (items.length > 0 && failed === items.length) {
    throw new Error(`${label}: all ${items.length} requests failed (last: ${lastError.message})`);
  }
  return results.flat();
}

const CS_TITLE = /\b(software|developer|programmer|engineer|sde|backend|back-end|frontend|front-end|full.?stack|java|python|javascript|react|node|spring|\.net|c\+\+|data analyst|data engineer|data scientist|machine learning|ml|ai|qa|quality assurance|test automation|devops|cloud|network|it support|technical support|computer|cyber|security analyst|database|dba|web)\b/i;
const NON_CS_TITLE = /\b(mechanical|civil|electrical|electronics|chemical|sales|marketing|hr|recruit\w*|accountant|nurse|teacher|customer care|call center|bpo|production|manufacturing|plant|mba)\b/i;

function isComputerScienceJob(title = '') {
  if (NON_CS_TITLE.test(title)) return false;
  return CS_TITLE.test(title);
}

module.exports = {
  http,
  isFresherCandidate,
  decodeEntities,
  sanitizeHtml,
  toIsoDate,
  parseRelativeDate,
  escapeHtml,
  mapAllOrThrow,
  isComputerScienceJob,
};
