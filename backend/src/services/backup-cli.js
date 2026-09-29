// One backup from the command line, the same file the app makes (name in the hospital's
// time zone, pg_dump --clean --if-exists, gzip -t, moved into /backups only when complete,
// the same pruning). Run inside the API container:
//
//   docker exec bethesda-emr-api node src/services/backup-cli.js update
//
// update.ps1 / update.sh call it once the new version is up and healthy, so that right
// after an update there is a backup of the database as it now is. The backups made before
// an update are of the old version, and a backup restores only onto the version that made
// it (DEPLOYMENT.md 5b) - wiki/modules/settings.md 2.13.
//
// It runs in its own process, so the server's "one backup at a time" lock does not see it;
// it writes into its own work folder so that it can never clear a file the server is
// writing at the same moment. Prints the file name; exit code 0 = done, 1 = failed.
const path = require('path');
const { dumpOnce } = require('./backup');

const fs = require('fs');

const trigger = process.argv[2] || 'cli';
const workDir = path.join('/backups', '.inprogress-' + trigger);
dumpOnce(trigger, workDir).then((r) => {
  // The work folder is ours alone and empty once the file has been moved (or removed on
  // failure); rmdir refuses a folder that is not empty, so nothing else can go with it.
  try { fs.rmdirSync(workDir); } catch (e) { /* already gone, or not empty */ }
  if (r.ok) { console.log(r.file); process.exit(0); }
  console.error('backup failed: ' + r.error);
  process.exit(1);
});
