const cheerio = require('cheerio');
const { http, parseRelativeDate } = require('../util');

const LISTING_URL = 'https://internshala.com/jobs/entry-level-jobs-in-pune/';
const BASE_URL = 'https://internshala.com';

function clean($el) {
  return $el.text().replace(/\s+/g, ' ').trim();
}

// Best-effort scrape. Internshala can change its markup or block bots, so this
// throws on an unexpected page and the pipeline records the failure and moves on.
async function fetchInternshalaJobs() {
  const { data: html } = await http.get(LISTING_URL, { headers: { Accept: 'text/html' } });
  const $ = cheerio.load(html);
  const cards = $('.individual_internship');

  if (cards.length === 0) {
    throw new Error('no listing cards found; the page layout may have changed');
  }

  const jobs = [];
  cards.each((_, el) => {
    const $card = $(el);
    const title = clean($card.find('.job-internship-name, .heading_4_5 a, .heading_5 a, h3 a').first());
    const href = $card
      .find('a[href*="/job/detail/"], a[href*="/internship/detail/"], a.view_detail_button')
      .first()
      .attr('href');
    if (!title || !href) return;

    const company = clean($card.find('.company-name, .company_name, .link_display_like_text').first());
    const salary = clean($card.find('.salary, .stipend, .salary-container').first());
    const posted =
      parseRelativeDate(clean($card.find('.status-info, .posted_by_container, .date').first())) ||
      parseRelativeDate(clean($card));
    const url = new URL(href, BASE_URL).href;

    jobs.push({
      title,
      company: company || 'Unknown company',
      location: 'Pune',
      source: 'internshala',
      source_url: url,
      apply_url: url,
      description: null,
      salary: salary || null,
      posted_at: posted,
    });
  });

  return jobs;
}

module.exports = { fetchInternshalaJobs };
