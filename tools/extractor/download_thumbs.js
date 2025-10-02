#!/usr/bin/env node

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

function sanitizeFilename(name) {
  return String(name || '')
    .replace(/[\\/\0\x08\x09\x1a\n\r\t\x0b:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferExtensionFromUrl(url) {
  try {
    const u = new URL(url);
    const ext = path.extname(u.pathname).toLowerCase();
    if (ext) return ext.replace(/\?.*$/, '');
  } catch (_) {}
  return '.jpg';
}

async function downloadFile(url, destPath) {
  await fse.ensureDir(path.dirname(destPath));
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; AssetArchiveBot/1.0; +https://example.com)'
  };
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        // Follow one redirect
        return https.get(res.headers.location, { headers }, (res2) => {
          const status2 = res2.statusCode || 0;
          if (status2 !== 200) {
            res2.resume();
            return reject(new Error(`HTTP ${status2} for ${url}`));
          }
          const fileStream = fs.createWriteStream(destPath);
          streamPipeline(res2, fileStream).then(resolve).catch(reject);
        }).on('error', reject);
      }
      if (status !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${status} for ${url}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      streamPipeline(res, fileStream).then(resolve).catch(reject);
    }).on('error', reject);
  });
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('dataDir', { type: 'string', default: path.join(__dirname, 'files', 'data'), describe: 'Directory containing parsed asset JSON files' })
    .option('outDir', { type: 'string', default: path.join(__dirname, 'files', 'thumbnails'), describe: 'Directory to write thumbnail images' })
    .option('limit', { type: 'number', default: 0, describe: 'Process only first N JSON files (0 = all)' })
    .option('dryRun', { type: 'boolean', default: false, describe: 'Do not download, just print planned actions' })
    .option('overwrite', { type: 'boolean', default: false, describe: 'Overwrite an existing thumbnail file if present' })
    .option('concurrency', { type: 'number', default: 5, describe: 'Number of concurrent downloads' })
    .help()
    .argv;

  const dataDir = argv.dataDir;
  const outDir = argv.outDir;
  await fse.ensureDir(outDir);

  const entries = await fse.readdir(dataDir, { withFileTypes: true });
  let files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json'))
    .map((e) => path.join(dataDir, e.name));

  files.sort();
  if (argv.limit > 0) files = files.slice(0, argv.limit);

  console.log(`Found ${files.length} JSON file(s) to process in ${dataDir}`);

  const tasks = files.map(async (jsonPath) => {
    try {
      const raw = await fse.readFile(jsonPath, 'utf8');
      const record = JSON.parse(raw);
      const thumbUrl = record.thumbnailUrl;
      if (!thumbUrl) {
        console.warn('No thumbnailUrl for', path.basename(jsonPath));
        return;
      }
      const ext = inferExtensionFromUrl(thumbUrl);
      const baseName = record.assetId ? String(record.assetId) : sanitizeFilename((record.sourceFile || '').replace(/\.unitypackage$/i, ''));
      const outPath = path.join(outDir, `${baseName}${ext}`);

      if (!argv.overwrite && (await fse.pathExists(outPath))) {
        console.log('Exists, skip:', path.basename(outPath));
        return;
      }

      if (argv.dryRun) {
        console.log('Would download =>', thumbUrl, '->', outPath);
        return;
      }

      await downloadFile(thumbUrl, outPath);
      console.log('Downloaded:', path.basename(outPath));
    } catch (err) {
      console.error('Failed for', path.basename(jsonPath), '-', err && err.message ? err.message : err);
    }
  });

  // Simple concurrency control
  const concurrency = Math.max(1, Number(argv.concurrency) || 5);
  const queue = tasks.slice();
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (next) await next;
    }
  });
  await Promise.all(workers);

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err && err.message ? err.message : err);
  process.exitCode = 1;
}); 