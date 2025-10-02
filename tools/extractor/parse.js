#!/usr/bin/env node

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

function normalizeQuery(sourceFilename) {
  const withoutHtml = sourceFilename.replace(/\.html$/i, '');
  const withoutUnityPackage = withoutHtml.replace(/\.unitypackage$/i, '');
  const normalized = withoutUnityPackage
    .replace(/[\-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

function tokenize(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function generateSlug(text) {
  if (!text) return null;
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseFloatFromText(text) {
  if (!text) return null;
  const match = text.match(/\$?([\d,]+\.?\d*)/);
  if (match && match[1]) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

function areObjectsDifferent(objA, objB) {
  const a = { ...objA };
  const b = { ...objB };

  // This field is expected to change on every run and shouldn't be compared
  delete a.updatedAt;
  delete b.updatedAt;
  
  return JSON.stringify(a) !== JSON.stringify(b);
}

function calculateMatchScore(query, title) {
  const queryTokens = Array.from(new Set(tokenize(query)));
  const titleTokens = new Set(tokenize(title));
  if (queryTokens.length === 0) return 0;
  let matches = 0;
  for (const qt of queryTokens) {
    if (titleTokens.has(qt)) matches += 1;
  }
  return matches / queryTokens.length;
}

function absoluteUrl(href) {
  try {
    if (!href) return null;
    const base = 'https://assetstore.unity.com';
    return new URL(href, base).href;
  } catch (_) {
    return null;
  }
}

function extractAssetIdFromHref(href) {
  if (!href) return null;
  // Patterns seen: /packages/package/248734 or slugged paths ending with -12345
  const m1 = href.match(/\/packages\/package\/(\d+)/);
  if (m1 && m1[1]) return m1[1];
  const m2 = href.match(/-(\d+)(?:[/?#]|$)/);
  if (m2 && m2[1]) return m2[1];
  return null;
}

function extractRating($, container) {
  // Prefer explicit numeric rating element if present
  const ratingText = $(container).find('[data-test="product-rating"]').first().text();
  if (ratingText) {
    const n = parseFloat(String(ratingText).trim());
    if (!Number.isNaN(n)) return n;
  }
  // Try common patterns: aria-label like "4.5 star rating" or numeric text
  const aria = $(container).find('[aria-label*="star rating"],[aria-label*="Rating:"]').first().attr('aria-label');
  if (aria) {
    const m = aria.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (m) return parseFloat(m[1]);
  }
  // Fallback: data-test or text-based rating badges (site may vary)
  const textMatch = $(container).find('[data-test="product-card-rating"], .rating, [aria-label*="rating"]').first().text();
  if (textMatch) {
    const m2 = textMatch.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (m2) return parseFloat(m2[1]);
  }
  return null;
}

function extractThumbnailFromScope($, scope) {
  // Prefer direct src attributes with key-image
  const srcEl = $(scope).find('[src*="key-image"]').first();
  if (srcEl && srcEl.attr('src')) return srcEl.attr('src');

  // Try srcset attributes (pick the first URL)
  const srcsetEl = $(scope).find('[srcset*="key-image"]').first();
  if (srcsetEl && srcsetEl.attr('srcset')) {
    const srcset = srcsetEl.attr('srcset');
    const firstUrl = (srcset.split(',')[0] || '').trim().split(' ')[0];
    if (firstUrl && firstUrl.includes('key-image')) return firstUrl;
  }

  // Try style attributes containing a background-image url(...key-image...)
  const styleEl = $(scope).find('[style*="key-image"]').first();
  if (styleEl && styleEl.attr('style')) {
    const style = styleEl.attr('style');
    const m = style.match(/url\(([^)]+key-image[^)]+)\)/i);
    if (m && m[1]) return m[1].replace(/^[\"']|[\"']$/g, '');
  }

  return null;
}

function extractAssetDataFromAnchor($, nameAnchor) {
  const $anchor = $(nameAnchor);
  const productUrlHref = $anchor.attr('href');
  const productUrl = absoluteUrl(productUrlHref);
  const assetId = extractAssetIdFromHref(productUrlHref);
  const productName = $anchor.text().trim();

  // Prefer the full article container as scope
  const $article = $anchor.closest('article');
  let $card = $anchor.closest('div.flex.flex-col');
  if ($card.length === 0) {
    $card = $anchor.closest('article, div');
  }

  // Publisher (search within the article)
  const $publisher = ($article.length ? $article : $card).find('a[data-test="product-card-publisher"]').first();
  const publisherName = ($publisher.text() || '').trim() || null;
  const publisherUrl = absoluteUrl($publisher.attr('href'));

  // Thumbnail image: search within the entire article first
  let thumbnailUrl = extractThumbnailFromScope($, $article.length ? $article : $card);
  if (!thumbnailUrl && $card.length) {
    thumbnailUrl = extractThumbnailFromScope($, $card);
  }

  // Rating (prefer article scope)
  const rating = extractRating($, $article.length ? $article : $card);

  const priceContainer = ($article.length ? $article : $card).find('[data-test="search-results-price"]');
  let price = 'N/A';
  let compareAtPrice = null;

  if (priceContainer.length > 0) {
    const originalPriceText = priceContainer.find('[data-test="product-card-original-price"]').text().trim();
    const currentPriceText = priceContainer.find('[data-test="product-card-current-price"]').text().trim();
    
    if (originalPriceText && currentPriceText) {
      // Sale item
      price = parseFloatFromText(currentPriceText);
      compareAtPrice = parseFloatFromText(originalPriceText);
    } else if (currentPriceText) {
      // Non-sale item with current price field
      const priceText = currentPriceText;
      if (priceText.toLowerCase().includes('free')) {
        price = 0;
      } else {
        price = parseFloatFromText(priceText);
      }
    } else {
      // Fallback to container text (covers FREE and simple price)
      const priceText = priceContainer.text().trim();
      if (priceText.toLowerCase().includes('free')) {
        price = 0;
      } else {
        price = parseFloatFromText(priceText);
      }
    }
  }

  return {
    assetId,
    productName,
    productUrl,
    publisherName,
    publisherUrl,
    thumbnailUrl,
    rating,
    price,
    compareAtPrice
  };
}

function updateCategoryTree(tree, categoryPath) {
  let currentNode = tree;
  for (const categoryName of categoryPath) {
    const slug = generateSlug(categoryName);
    if (!currentNode[slug]) {
      currentNode[slug] = {
        name: categoryName,
        slug: slug,
        children: {}
      };
    }
    currentNode = currentNode[slug].children;
  }
}

async function findBestMatchFromSearchPage(htmlFilePath) {
  const filename = path.basename(htmlFilePath);
  const html = await fse.readFile(htmlFilePath, 'utf8');
  const $ = cheerio.load(html);

  // Identify candidates via product name anchors
  let candidates = [];
  $('a[data-test="product-card-name"]').each((_, el) => {
    const candidate = extractAssetDataFromAnchor($, el);
    if (candidate && candidate.productUrl) candidates.push(candidate);
  });

  // Fallback if zero candidates: any package link
  if (candidates.length === 0) {
    $('a[href^="/packages/package/"]').each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const productUrl = absoluteUrl(href);
      const assetId = extractAssetIdFromHref(href);
      const productName = $link.text().trim();
      if (productUrl && assetId) {
        candidates.push({ productName, productUrl, assetId, publisherName: null, publisherUrl: null, thumbnailUrl: null, rating: null, price: 'N/A', compareAtPrice: null });
      }
    });
  }

  const sourceFile = filename.replace(/ - search page\.html$/i, '.unitypackage');
  const searchQuery = normalizeQuery(sourceFile);

  // Score candidates
  let best = null;
  let bestScore = -1;
  for (const c of candidates) {
    const score = calculateMatchScore(searchQuery, c.productName || '');
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }

  if (!best) {
    return {
      // Core identifiers
      assetId: null,
      title: null,
      slug: null,
      
      // Descriptions (N/A - need product page)
      shortDescription: "N/A",
      description: "N/A",
      
      // Pricing (N/A - need product page)
      price: "N/A",
      points: 200,
      compareAtPrice: null,
      available: "N/A",
      
      // Ratings & Media
      rating: null,
      thumbnail: null,
      
      // Classification (N/A - need product page)
      category: "N/A",
      
      // Publisher (restructured as nested object)
      publisher: {
        name: null,
        url: null,
        slug: null
      },
      
      // References
      productUrl: null,
      sourceFile,
      
      // Status & timestamps
      status: "draft",
      visibility: "public",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Extra reference data (keep for debugging/tracking)
      searchQuery,
      matchConfidence: 0
    };
  }

  return {
    // Core identifiers
    assetId: best.assetId || null,
    title: best.productName || null,
    slug: generateSlug(best.productName),
    
    // Descriptions (N/A - need product page)
    shortDescription: "N/A",
    description: "N/A",
    
    // Pricing (N/A - need product page)
    price: best.price,
    points: 200,
    compareAtPrice: best.compareAtPrice,
    available: "N/A",
    
    // Ratings & Media
    rating: best.rating != null ? best.rating : null,
    thumbnail: best.thumbnailUrl || null,
    
    // Classification (N/A - need product page)
    category: "N/A",
    
    // Publisher (restructured as nested object)
    publisher: {
      name: best.publisherName || null,
      url: best.publisherUrl || null,
      slug: generateSlug(best.publisherName)
    },
    
    // References
    productUrl: best.productUrl || null,
    sourceFile,
    
    // Status & timestamps
    status: "draft",
    visibility: "public",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    // Extra reference data (keep for debugging/tracking)
    searchQuery,
    matchConfidence: Math.round(bestScore * 100) / 100
  };
}

async function processSearchFile(htmlFilePath, outputDir, argv) {
  const result = await findBestMatchFromSearchPage(htmlFilePath);

  const outFilename = path.basename(result.sourceFile).replace(/\.unitypackage$/i, '.json');
  const outPath = path.join(outputDir, outFilename);

  let existingData = null;
  if (await fse.pathExists(outPath)) {
    try {
      existingData = await fse.readJson(outPath);
    } catch (err) {
      console.warn(`Warning: Corrupted JSON file ${outFilename} will be overwritten.`);
    }
  }

  if (existingData) {
    result.createdAt = existingData.createdAt; // Preserve original creation timestamp
  }

  const hasChanged = !existingData || areObjectsDifferent(result, existingData);

  if (argv.dryRun) {
    if (hasChanged) {
      console.log(`-- Would update ${outFilename} --`);
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`-- Unchanged ${outFilename} --`);
    }
  } else if (hasChanged) {
    await fse.writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(existingData ? 'Updated:' : 'Created:', outFilename);
  } else {
    console.log('Unchanged:', outFilename);
  }
}

async function processProductFile(htmlFilePath, outputDir, argv, categoryTree) {
  const filename = path.basename(htmlFilePath);
  const jsonFilename = filename.replace(/ - product page\.html$/i, '.json');
  const jsonPath = path.join(outputDir, jsonFilename);

  if (!(await fse.pathExists(jsonPath))) {
    console.warn(`Warning: Skipping ${filename}, no corresponding JSON file found.`);
    return;
  }

  const html = await fse.readFile(htmlFilePath, 'utf8');
  const $ = cheerio.load(html);

  const description = ($('#description-panel ._1_3uP._1rkJa').text() || '').trim();

  if (!description) {
    console.log(`No description found in ${filename}`);
    return;
  }
  
  const existingData = await fse.readJson(jsonPath);
  const shortDescription = (description.split('. ')[0] || '').trim();

  // Category Extraction
  let newCategorySlug = null;
  const breadcrumbScript = $('script[type="application/ld+json"]').filter((i, el) => {
    try {
      const json = JSON.parse($(el).html());
      return json['@type'] === 'BreadcrumbList';
    } catch (e) {
      return false;
    }
  });

  if (breadcrumbScript.length > 0) {
    const breadcrumbJson = JSON.parse(breadcrumbScript.html());
    const items = breadcrumbJson.itemListElement || [];
    
    // Exclude "Home" and the last item (product page)
    const categoryPath = items.slice(1, -1).map(item => item.name); 

    if (categoryPath.length > 0) {
      // The asset's category is the last one in the hierarchy
      const leafCategoryName = categoryPath[categoryPath.length - 1];
      newCategorySlug = generateSlug(leafCategoryName);
      
      // Update the global category tree
      updateCategoryTree(categoryTree, categoryPath);
    }
  }

  const needsUpdate = (
    existingData.description !== description ||
    existingData.shortDescription !== shortDescription ||
    (newCategorySlug && existingData.category !== newCategorySlug)
  );

  if (needsUpdate) {
    const updatedData = {
      ...existingData,
      description: description,
      shortDescription: shortDescription,
      updatedAt: new Date().toISOString()
    };

    if (newCategorySlug) {
      updatedData.category = newCategorySlug;
    }
    
    if (argv.dryRun) {
      console.log(`-- Would update data for ${jsonFilename} --`);
    } else {
      await fse.writeFile(jsonPath, JSON.stringify(updatedData, null, 2), 'utf8');
      console.log(`Updated data for: ${jsonFilename}`);
    }
  } else {
    console.log(`Data unchanged for: ${jsonFilename}`);
  }
}

async function main() {
  const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 [options]')
    .option('input-dir', {
      alias: 'i',
      type: 'string',
      description: 'Input directory containing HTML files'
    })
    .option('output-dir', {
      alias: 'o',
      type: 'string',
      description: 'Output directory for JSON files',
      default: path.join(__dirname, 'files', 'data')
    })
    .option('dry-run', {
      type: 'boolean',
      description: 'Perform a dry run without writing files',
      default: false
    })
    .option('type', {
      alias: 't',
      type: 'string',
      description: 'Type of parse to run (search, product)',
      default: 'search'
    })
    .help()
    .argv;

  const parseType = argv.type;
  let inputDir = argv.inputDir;
  if (!inputDir) {
    inputDir = path.join(__dirname, 'files', 'html', parseType);
  }

  const outputDir = argv.outputDir;
  const categoryTreePath = path.join(__dirname, 'files', 'category-tree.json');

  console.log(`Running parse type "${parseType}" on directory: ${inputDir}`);

  let categoryTree = {};
  try {
    await fse.ensureFile(categoryTreePath);
    const content = await fse.readFile(categoryTreePath, 'utf8');
    categoryTree = content ? JSON.parse(content) : {};
  } catch (err) {
    console.warn('Warning: Could not read category-tree.json. Starting with a new tree.');
    categoryTree = {};
  }

  try {
    await fse.ensureDir(outputDir);
  } catch (err) {
    console.error('Failed to create output directory:', outputDir);
    return;
  }

  const files = await fse.readdir(inputDir);
  const htmlFiles = files.filter(f => f.toLowerCase().endsWith('.html'));

  console.log(`Found ${htmlFiles.length} HTML files to process.`);

  for (const file of htmlFiles) {
    const filePath = path.join(inputDir, file)
    try {
      if (parseType === 'product') {
        await processProductFile(filePath, outputDir, argv, categoryTree);
      } else {
        await processSearchFile(filePath, outputDir, argv);
      }
    } catch (err) {
      console.error('Failed to parse', path.basename(filePath), '-', err && err.message ? err.message : err);
    }
  }

  if (parseType === 'product') {
    try {
      await fse.writeFile(categoryTreePath, JSON.stringify(categoryTree, null, 2), 'utf8');
      console.log('Successfully updated category-tree.json');
    } catch (err) {
      console.error('Error writing category-tree.json:', err.message);
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err && err.message ? err.message : err);
  process.exitCode = 1;
}); 