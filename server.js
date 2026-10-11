const path = require('path');
const express = require('express');
const cron = require('node-cron');

require('./db');
const jobRoutes = require('./routes/jobs');
const { runAllFetchers } = require('./lib/pipeline');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

app.locals.timeAgo = (iso) => {
  if (!iso) return 'unknown date';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (Number.isNaN(days)) return 'unknown date';
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

app.use('/', jobRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Not found', message: 'That page does not exist.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Something went wrong', message: 'Please try again in a moment.' });
});

// Every 6 hours while the server is running.
cron.schedule('0 */6 * * *', () => {
  runAllFetchers().catch((err) => console.error('[cron] fetch run failed:', err.message));
});

app.listen(PORT, () => {
  console.log(`Pune fresher job tracker running at http://localhost:${PORT}`);
});
