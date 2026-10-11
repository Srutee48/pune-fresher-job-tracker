# Pune Fresher Job Tracker

A local Express and SQLite app that collects fresher job openings in Pune from public job boards, then lets you search, filter, and track them.

## Setup

Requires Node.js 18.11 or newer (Node 20 LTS recommended).

```bash
npm install
npm run seed     # optional: load 34 demo jobs
npm start        # open http://localhost:3000
```

Use `npm run dev` to restart automatically when you edit files.

## Fetching jobs

```bash
npm run fetch
```

This runs every source once and prints a summary. While the server is running, the same fetch also runs every 6 hours. Each run is recorded in the `fetch_logs` table.

Sources:

- **Greenhouse** (`lib/fetchers/greenhouse.js`): public boards API for 17 companies. Keeps roles located in Pune.
- **Lever** (`lib/fetchers/lever.js`): public postings API for 10 companies. Keeps roles located in Pune.
- **Internshala** (`lib/fetchers/internshala.js`): best-effort scrape of the Pune entry-level listing.
- **Naukri** (`lib/fetchers/naukri.js`): best-effort call to the search endpoint. Naukri often blocks non-browser clients.

If one source fails, its error is logged and the others still run. The app works without any network access, because the seed data covers the demo.

## Pages

- `/` lists jobs. Search by title or company, filter by source, show only active jobs, and sort by posted or added date.
- `/job/:id` shows the full description, metadata, an apply link, and an active/inactive toggle.
- `/stats` shows totals, jobs per source, and jobs added per day for the last 14 days.
- `/add` adds a job by hand.

## Notes

- Company board tokens (Greenhouse) and slugs (Lever) are hardcoded in the fetcher files. If one returns 404, it is logged and skipped. Edit the arrays to add or remove companies.
- Jobs first seen more than 30 days ago are marked inactive on each fetch.
- Jobs are deduplicated by their source URL, so re-running a fetch does not create duplicates.
- The fresher filter keeps a job when its title or metadata signals an entry-level role. It also keeps jobs it cannot classify, and drops only clearly senior titles. This is intentionally lenient for the demo.
- Seed companies are fictional.
- The database lives at `data/jobs.db`. Delete that file to start over.
