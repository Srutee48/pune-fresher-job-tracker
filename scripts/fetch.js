const { runAllFetchers } = require('../lib/pipeline');

runAllFetchers()
  .then((result) => {
    if (!result) return;
    console.log('\nFetch summary:');
    for (const s of result.sources) {
      const note = s.status === 'error' ? `  error: ${s.error}` : '';
      console.log(`  ${s.source.padEnd(12)} found ${String(s.jobs_found).padStart(3)}  added ${String(s.jobs_added).padStart(3)}  ${s.status}${note}`);
    }
    console.log(`Stale jobs marked inactive: ${result.deactivated}`);
  })
  .catch((err) => {
    console.error('Fetch run failed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
