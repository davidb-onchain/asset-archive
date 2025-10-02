#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Parse command-line arguments
const args = process.argv.slice(2);
const fetchType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'search';

async function readUnityPackageFilenames(inputDirectoryAbsolutePath) {
  const allEntries = await fs.promises.readdir(inputDirectoryAbsolutePath, { withFileTypes: true });
  const filenames = allEntries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.unitypackage'))
    .map((entry) => entry.name);
  return filenames;
}

function buildSearchQueryFromFilename(filename) {
  const withoutExtension = filename.replace(/\.unitypackage$/i, '');
  const normalized = withoutExtension
    .replace(/[\-_\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

async function ensureDirectoryExists(directoryAbsolutePath) {
  await fs.promises.mkdir(directoryAbsolutePath, { recursive: true });
}

async function saveHtmlToFile(outputDirectoryAbsolutePath, outputFilename, html) {
  const outputPath = path.join(outputDirectoryAbsolutePath, outputFilename);
  await fs.promises.writeFile(outputPath, html, 'utf8');
  return outputPath;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acceptCookiesIfPresent(page) {
  try {
    // Common OneTrust accept buttons
    const selectors = [
      '#onetrust-accept-btn-handler',
      'button#onetrust-accept-btn-handler',
      'button[aria-label="Accept all"]',
      'button:contains("Accept All")',
      'button:contains("Accept all")',
      'button:contains("I Agree")'
    ];
    for (const sel of selectors) {
      const found = await page.$(sel);
      if (found) {
        await found.click().catch(() => {});
        await delay(300);
        break;
      }
    }
  } catch (_) {}
}

async function handleCloudflareIfPresent(page) {
  try {
    const challengeDetected = await page.evaluate(() => {
      const text = document.body ? document.body.innerText.toLowerCase() : '';
      return text.includes('checking your browser before accessing') ||
             text.includes('please allow up to 5 seconds') ||
             document.querySelector('#cf-challenge, .cf-challenge') !== null;
    });
    if (challengeDetected) {
      // Wait a bit for the challenge to pass automatically
      for (let i = 0; i < 10; i++) {
        await delay(1000);
        const gone = await page.evaluate(() =>
          !document.querySelector('#cf-challenge, .cf-challenge') &&
          !(document.body ? document.body.innerText.toLowerCase().includes('checking your browser before accessing') : false)
        );
        if (gone) break;
      }
    }
  } catch (_) {}
}

async function waitForSearchResults(page) {
  // Ensure interstitials don't block rendering
  await acceptCookiesIfPresent(page);
  await handleCloudflareIfPresent(page);

  // Wait for results inside main content. Avoid matching header/nav links.
  const result = await page.waitForFunction(
    () => {
      const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
      if (!main) return false;
      const links = main.querySelectorAll('a[href^="/packages/"]');
      // Require at least one likely result link in main content
      if (links.length > 0) return true;
      // Detect obvious no-results messaging
      const text = main.innerText ? main.innerText.toLowerCase() : '';
      if (text.includes('no results') || text.includes('0 results')) return true;
      return false;
    },
    { timeout: 90000 }
  );
  return result;
}

async function smallScroll(page) {
  try {
    await page.evaluate(() => {
      window.scrollBy({ top: 400, left: 0, behavior: 'auto' });
    });
    await delay(250);
  } catch (_) {}
}

async function createBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  });
  return browser;
}

async function createConfiguredPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit(537.36) (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });
  return page;
}

async function fetchAndSaveSearchHtmlForQuery(page, query, outputDirectoryAbsolutePath, outputFilename) {
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `https://assetstore.unity.com/search#q=${encodedQuery}`;

  console.log('[Fetch URL]:', searchUrl);
  const response = await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  const status = response ? response.status() : 'n/a';
  const finalUrl = response ? response.url() : page.url();
  console.log('[HTTP]: status =', status, 'finalUrl =', finalUrl);

  await acceptCookiesIfPresent(page);
  await handleCloudflareIfPresent(page);

  await waitForSearchResults(page);
  await smallScroll(page);

  const html = await page.content();
  const outputPath = await saveHtmlToFile(outputDirectoryAbsolutePath, outputFilename, html);
  return { searchUrl, outputPath };
}

async function fetchAndSaveProductHtml(page, productUrl, outputDirectoryAbsolutePath, outputFilename) {
  console.log('[Fetch URL]:', productUrl);
  const response = await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  const status = response ? response.status() : 'n/a';
  const finalUrl = response ? response.url() : page.url();
  console.log('[HTTP]: status =', status, 'finalUrl =', finalUrl);

  await acceptCookiesIfPresent(page);
  await handleCloudflareIfPresent(page);

  // Wait for product page to load - look for product title or main content
  await page.waitForFunction(
    () => {
      const main = document.querySelector('main') || document.body;
      if (!main) return false;
      // Look for common product page elements
      return main.querySelector('h1, [class*="product"], [class*="asset"]') !== null;
    },
    { timeout: 90000 }
  );

  await smallScroll(page);
  await delay(1000); // Extra time for dynamic content

  const html = await page.content();
  const outputPath = await saveHtmlToFile(outputDirectoryAbsolutePath, outputFilename, html);
  return { productUrl, outputPath };
}

async function readJsonFiles(dataDirectoryAbsolutePath) {
  const allEntries = await fs.promises.readdir(dataDirectoryAbsolutePath, { withFileTypes: true });
  const jsonFiles = allEntries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name);
  return jsonFiles;
}

async function fetchProductPages(browser, extractorRoot) {
  const dataDir = path.join(extractorRoot, 'files', 'data');
  const outputDir = path.join(extractorRoot, 'files', 'html', 'product');

  await ensureDirectoryExists(dataDir);
  await ensureDirectoryExists(outputDir);

  const jsonFiles = await readJsonFiles(dataDir);
  
  if (jsonFiles.length === 0) {
    console.log('No JSON files found in', dataDir);
    console.log('Run "npm run parse" first to generate data files.');
    return;
  }

  console.log(`Found ${jsonFiles.length} JSON file(s). Fetching product pages...`);

  const page = await createConfiguredPage(browser);
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  try {
    for (const jsonFile of jsonFiles) {
      const jsonPath = path.join(dataDir, jsonFile);
      
      try {
        const content = await fs.promises.readFile(jsonPath, 'utf8');
        const data = JSON.parse(content);

        console.log(`\n[Processing] ${jsonFile}`);

        // Check if productUrl exists
        if (!data.productUrl) {
          console.log('[Skip] No productUrl found in JSON');
          skipCount++;
          continue;
        }

        // Check if assetId exists (use as filename)
        if (!data.assetId) {
          console.log('[Skip] No assetId found in JSON');
          skipCount++;
          continue;
        }

        // Check if sourceFile exists
        if (!data.sourceFile) {
          console.log('[Skip] No sourceFile found in JSON');
          skipCount++;
          continue;
        }

        const baseName = data.sourceFile.replace(/\.unitypackage$/i, '');
        const outputFilename = `${baseName} - product page.html`;
        const outputPath = path.join(outputDir, outputFilename);

        // Check if file already exists
        if (fs.existsSync(outputPath)) {
          console.log('[Skip] HTML already exists:', outputFilename);
          skipCount++;
          continue;
        }

        console.log(`Asset ID: ${data.assetId}`);
        console.log(`Product: ${data.title || 'Unknown'}`);

        const result = await fetchAndSaveProductHtml(
          page,
          data.productUrl,
          outputDir,
          outputFilename
        );
        
        console.log('Saved HTML to:', result.outputPath);
        successCount++;

        // Small delay between requests to be polite
        await delay(2000);

      } catch (err) {
        console.error(`[Error] Failed to process "${jsonFile}":`, err && err.message ? err.message : err);
        errorCount++;
      }
    }
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
  }

  console.log(`\nProduct Page Fetch Summary:`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Errors: ${errorCount}`);
}

async function fetchAndSavePublisherHtml(page, publisherUrl, outputDirectoryAbsolutePath, outputFilename) {
  console.log('[Fetch URL]:', publisherUrl);
  const response = await page.goto(publisherUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  const status = response ? response.status() : 'n/a';
  const finalUrl = response ? response.url() : page.url();
  console.log('[HTTP]: status =', status, 'finalUrl =', finalUrl);

  await acceptCookiesIfPresent(page);
  await handleCloudflareIfPresent(page);

  // Wait for publisher page to load - look for publisher content
  await page.waitForFunction(
    () => {
      const main = document.querySelector('main') || document.body;
      if (!main) return false;
      // Look for common publisher page elements
      return main.querySelector('h1, [class*="publisher"], [class*="author"]') !== null;
    },
    { timeout: 90000 }
  );

  await smallScroll(page);
  await delay(1000); // Extra time for dynamic content

  const html = await page.content();
  const outputPath = await saveHtmlToFile(outputDirectoryAbsolutePath, outputFilename, html);
  return { publisherUrl, outputPath };
}

function extractPublisherIdFromUrl(publisherUrl) {
  // Extract publisher ID from URL like: https://assetstore.unity.com/publishers/5232
  const match = publisherUrl.match(/\/publishers\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchPublisherPages(browser, extractorRoot) {
  const dataDir = path.join(extractorRoot, 'files', 'data');
  const outputDir = path.join(extractorRoot, 'files', 'html', 'publisher');

  await ensureDirectoryExists(dataDir);
  await ensureDirectoryExists(outputDir);

  const jsonFiles = await readJsonFiles(dataDir);
  
  if (jsonFiles.length === 0) {
    console.log('No JSON files found in', dataDir);
    console.log('Run "npm run parse" first to generate data files.');
    return;
  }

  console.log(`Found ${jsonFiles.length} JSON file(s). Collecting unique publishers...`);

  // Collect unique publishers across all JSON files
  const publishersMap = new Map(); // publisherId -> { publisherUrl, publisherName }

  for (const jsonFile of jsonFiles) {
    try {
      const jsonPath = path.join(dataDir, jsonFile);
      const content = await fs.promises.readFile(jsonPath, 'utf8');
      const data = JSON.parse(content);

      if (data.publisher && data.publisher.url) {
        const publisherId = extractPublisherIdFromUrl(data.publisher.url);
        if (publisherId && !publishersMap.has(publisherId)) {
          publishersMap.set(publisherId, {
            publisherUrl: data.publisher.url,
            publisherName: data.publisher.name || 'Unknown'
          });
        }
      }
    } catch (err) {
      console.error(`[Error] Failed to read "${jsonFile}":`, err && err.message ? err.message : err);
    }
  }

  const uniquePublishers = Array.from(publishersMap.entries());
  console.log(`Found ${uniquePublishers.length} unique publisher(s). Fetching publisher pages...`);

  const page = await createConfiguredPage(browser);
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  try {
    for (const [publisherId, publisherData] of uniquePublishers) {
      try {
        console.log(`\n[Processing] Publisher ID: ${publisherId}`);
        console.log(`Publisher: ${publisherData.publisherName}`);

        const outputFilename = `${publisherId}.html`;
        const outputPath = path.join(outputDir, outputFilename);

        // Check if file already exists
        if (fs.existsSync(outputPath)) {
          console.log('[Skip] HTML already exists:', outputFilename);
          skipCount++;
          continue;
        }

        const result = await fetchAndSavePublisherHtml(
          page,
          publisherData.publisherUrl,
          outputDir,
          outputFilename
        );
        
        console.log('Saved HTML to:', result.outputPath);
        successCount++;

        // Small delay between requests to be polite
        await delay(2000);

      } catch (err) {
        console.error(`[Error] Failed to fetch publisher "${publisherId}":`, err && err.message ? err.message : err);
        errorCount++;
      }
    }
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
  }

  console.log(`\nPublisher Page Fetch Summary:`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Errors: ${errorCount}`);
}

async function fetchSearchPages(browser, extractorRoot) {
  const inputDirectoryAbsolutePath = path.join(extractorRoot, 'files', 'source');
  const outputDirectoryAbsolutePath = path.join(extractorRoot, 'files', 'html', 'search');

  await ensureDirectoryExists(inputDirectoryAbsolutePath);
  await ensureDirectoryExists(outputDirectoryAbsolutePath);

  const filenames = await readUnityPackageFilenames(inputDirectoryAbsolutePath);
  if (filenames.length === 0) {
    console.log('No .unitypackage files found in', inputDirectoryAbsolutePath);
    console.log('Place files there and re-run: npm run fetch');
    return;
  }

  console.log(`Found ${filenames.length} .unitypackage file(s). Starting fetch...`);

  const page = await createConfiguredPage(browser);
  
  try {
    for (const filename of filenames) {
      const query = buildSearchQueryFromFilename(filename);
      const baseName = filename.replace(/\.unitypackage$/i, '');
      const outputFilename = `${baseName} - search page.html`;

      console.log(`\n[Processing] ${filename}`);
      console.log(`Query: "${query}"`);

      try {
        const { searchUrl, outputPath } = await fetchAndSaveSearchHtmlForQuery(
          page,
          query,
          outputDirectoryAbsolutePath,
          outputFilename
        );
        console.log('Saved HTML to:', outputPath);
      } catch (err) {
        console.error(`[Error] Failed to fetch/save for "${filename}":`, err && err.message ? err.message : err);
      }
    }
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
  }
}

async function main() {
  const extractorRoot = __dirname; // absolute path to tools/extractor
  const browser = await createBrowser();

  try {
    if (fetchType === 'search') {
      await fetchSearchPages(browser, extractorRoot);
    } else if (fetchType === 'product') {
      await fetchProductPages(browser, extractorRoot);
    } else if (fetchType === 'publisher') {
      await fetchPublisherPages(browser, extractorRoot);
    } else {
      console.error('Invalid --type argument. Use --type=search, --type=product, or --type=publisher.');
      process.exit(1);
    }
  } finally {
    await browser.close();
  }

  console.log('\nAll done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
}); 