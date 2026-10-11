const db = require('../db');
const { isComputerScienceJob } = require('../lib/util');

const rows = db.prepare("SELECT id, title FROM jobs WHERE source != 'manual'").all();
const remove = db.prepare('DELETE FROM jobs WHERE id = ?');
let removed = 0;
for (const row of rows) {
  if (!isComputerScienceJob(row.title)) {
    remove.run(row.id);
    removed += 1;
  }
}
console.log(`Removed ${removed} non-CS jobs.`);