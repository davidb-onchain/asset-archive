#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'demo', 'data');
const outputFile = path.join(rootDir, 'demo', 'assets.json');

console.log('🔄 Generating demo assets.json...');

try {
  // Read all JSON files from demo/data
  const files = fs.readdirSync(dataDir);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'parsed_results.jsonl');
  
  console.log(`📂 Found ${jsonFiles.length} asset files`);
  
  // Load and parse each file
  const assets = jsonFiles.map(file => {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  });
  
  // Create output structure
  const output = { assets };
  
  // Write combined file
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  
  console.log(`✅ Generated demo/assets.json with ${assets.length} assets`);
  console.log(`📄 Output: ${outputFile}`);
} catch (error) {
  console.error('❌ Error generating demo data:', error.message);
  process.exit(1);
} 