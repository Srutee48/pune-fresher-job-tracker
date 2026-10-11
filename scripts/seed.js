const db = require('../db');
const { escapeHtml } = require('../lib/util');

const DAY_MS = 24 * 60 * 60 * 1000;

// [title, company, location, salary, days since first seen]
// Companies are fictional, so this demo data does not look like real postings.
const SEED_JOBS = [
  ['Java Developer (Fresher)', 'Kestrel Labs', 'Hinjewadi, Pune', 'INR 3.5-5 LPA', 1],
  ['SDE Intern - Backend', 'Brightwave Technologies', 'Kharadi, Pune', 'INR 30,000/month stipend', 0],
  ['Graduate Engineer Trainee', 'NimbusCart', 'Viman Nagar, Pune', 'INR 4-5 LPA', 3],
  ['Associate Data Analyst (0-1 yrs)', 'Orbit Analytics', 'Baner, Pune', 'INR 3-4 LPA', 2],
  ['Technical Support Engineer - Trainee', 'Helix Soft', 'Hinjewadi, Pune', 'INR 2.5-3 LPA', 6],
  ['QA Engineer - Fresher', 'PeakFin', 'Magarpatta, Pune', 'INR 3-4 LPA', 4],
  ['Junior Software Engineer', 'Quarry Systems', 'Kharadi, Pune', 'INR 4-6 LPA', 5],
  ['Full Stack Intern (React + Node)', 'Lumen Retail Tech', 'Kalyani Nagar, Pune', 'INR 20,000/month stipend', 1],
  ['Spring Boot Developer (Fresher)', 'Tessera Software', 'Hinjewadi, Pune', 'INR 3.6-4.5 LPA', 7],
  ['Python Developer - Entry Level', 'Silverline Digital', 'Wakad, Pune', 'INR 3-5 LPA', 9],
  ['Software Engineer Trainee', 'Atlas Cloud Works', 'Kharadi, Pune', 'INR 3.5-4 LPA', 0],
  ['Manual QA Intern', 'Monolith Games', 'Aundh, Pune', 'INR 15,000/month stipend', 10],
  ['Network Support Trainee', 'Meridian Networks', 'Hadapsar, Pune', 'INR 2.4-3 LPA', 12],
  ['Data Engineer Trainee', 'Pinecrest Logistics Tech', 'Hinjewadi, Pune', 'INR 4-5 LPA', 2],
  ['Business Analyst - Fresher', 'Harbor Payments', 'Baner, Pune', 'INR 3-4.5 LPA', 8],
  ['React Frontend Intern', 'Juniper Commerce', 'Viman Nagar, Pune', 'INR 18,000/month stipend', 3],
  ['Cloud Support Associate (0-1 yrs)', 'Cobalt Infosec', 'Kharadi, Pune', 'INR 3.2-4 LPA', 11],
  ['Associate Software Engineer', 'Solstice AI', 'Hinjewadi, Pune', 'INR 5-6 LPA', 1],
  ['Java Backend Intern', 'Meridian Edu', 'Kothrud, Pune', 'INR 12,000/month stipend', 4],
  ['Graduate Software Developer', 'Vantage Health Tech', 'Magarpatta, Pune', 'INR 4-5.5 LPA', 13],
  ['Junior Data Analyst', 'Crescent Retail Analytics', 'Wakad, Pune', 'INR 3-3.8 LPA', 6],
  ['Application Support Trainee', 'Ironbridge Systems', 'Hinjewadi, Pune', 'INR 2.8-3.2 LPA', 5],
  ['Test Automation Intern (Selenium)', 'Quantra Labs', 'Baner, Pune', 'INR 16,000/month stipend', 9],
  ['Software Developer - Entry Level', 'Fernhill Digital', 'Kharadi, Pune', 'INR 3.5-4.5 LPA', 2],
  ['Trainee Engineer - Embedded Java', 'Northgate Automotive Software', 'Chakan, Pune', 'INR 3-3.5 LPA', 10],
  ['Frontend Developer (Fresher)', 'Bluegrass Studio', 'Aundh, Pune', 'INR 3-4 LPA', 7],
  ['Graduate Trainee - Operations Tech', 'Tidewater Logistics', 'Hinjewadi, Pune', 'INR 3.6 LPA', 12],
  ['Scrum Intern', 'Evergreen Fintech', 'Viman Nagar, Pune', 'INR 25,000/month stipend', 0],
  ['Database Developer - Trainee', 'Granite Data Systems', 'Kharadi, Pune', 'INR 3-4 LPA', 4],
  ['Customer Success Associate (0-1 yrs)', 'Sparrow CRM', 'Wakad, Pune', 'INR 3 LPA', 8],
  ['Intern - Machine Learning', 'Vector Ridge AI', 'Hinjewadi, Pune', 'INR 35,000/month stipend', 3],
  ['Junior Java Developer', 'Ardent Software', 'Kothrud, Pune', 'INR 4-5 LPA', 13],
  ['Software Test Engineer - Trainee', 'Cascade Mobility', 'Baner, Pune', 'Not disclosed', 6],
  ['Graduate Engineer - Full Stack', 'Riverside Insurtech', 'Magarpatta, Pune', 'INR 4.2-5 LPA', 11],
];

function describe(title, company) {
  return [
    `<p><strong>${escapeHtml(company)}</strong> is hiring a ${escapeHtml(title)} for its Pune team.`,
    'This role is open to recent graduates and early-career engineers.</p>',
    '<p>What we are looking for:</p>',
    '<ul>',
    '<li>Solid grasp of programming fundamentals and object-oriented design</li>',
    '<li>Good communication and a willingness to learn quickly</li>',
    '<li>Hands-on project experience, from coursework or personal work, is a plus</li>',
    '</ul>',
  ].join('');
}

const insert = db.prepare(`
  INSERT OR IGNORE INTO jobs
    (title, company, location, source, source_url, apply_url, description, salary, posted_at, first_seen_at, is_active)
  VALUES
    (@title, @company, @location, 'seed', @source_url, @apply_url, @description, @salary, @posted_at, @first_seen_at, 1)
`);

const seed = db.transaction(() => {
  const removed = db.prepare("DELETE FROM jobs WHERE source = 'seed'").run().changes;
  const now = Date.now();
  let added = 0;

  SEED_JOBS.forEach(([title, company, location, salary, daysAgo], i) => {
    const firstSeen = new Date(now - daysAgo * DAY_MS - (i % 5) * 60 * 60 * 1000);
    const posted = new Date(firstSeen.getTime() - (1 + (i % 4)) * DAY_MS);
    const slug = `${i + 1}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    added += insert.run({
      title,
      company,
      location,
      salary,
      source_url: `https://example.com/seed/jobs/${i + 1}`,
      apply_url: `https://example.com/careers/${slug}`,
      description: describe(title, company),
      posted_at: posted.toISOString(),
      first_seen_at: firstSeen.toISOString(),
    }).changes;
  });

  return { removed, added };
});

const { removed, added } = seed();
console.log(`Seed complete: removed ${removed} old seed jobs, inserted ${added} new ones.`);
