/**
 * extract-catalog.mjs
 * Reads catalog.astro HTML, parses categories and products via regex,
 * and writes structured JSON to src/content/pages/catalog.json.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const inputPath = resolve(root, 'src/pages/catalog.astro');
const outputPath = resolve(root, 'src/content/pages/catalog.json');

const html = readFileSync(inputPath, 'utf-8');

// Split into category sections by <h2> tags
const sectionRegex = /<h2 class="cat-section-title" id="([^"]+)">([^<]*(?:&amp;[^<]*)*)<\/h2>/g;
const sections = [];
let match;

while ((match = sectionRegex.exec(html)) !== null) {
  sections.push({
    id: match[1],
    rawTitle: match[2],
    startIndex: match.index,
  });
}

// Decode HTML entities
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Parse icon (emoji) and title from raw title text
function parseTitle(rawTitle) {
  const decoded = decodeEntities(rawTitle);
  // Match leading emoji(s) followed by space(s) then the rest
  const emojiMatch = decoded.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s+(.+)$/u);
  if (emojiMatch) {
    return { icon: emojiMatch[1], title: emojiMatch[2].trim() };
  }
  // Fallback: treat first non-space cluster as icon
  const parts = decoded.match(/^(\S+)\s+(.+)$/);
  if (parts) {
    return { icon: parts[1], title: parts[2].trim() };
  }
  return { icon: '', title: decoded.trim() };
}

// Extract products from a chunk of HTML
function extractProducts(htmlChunk) {
  const products = [];
  const cardRegex = /<div class="p-card">/g;
  let cardMatch;
  const cardStarts = [];

  while ((cardMatch = cardRegex.exec(htmlChunk)) !== null) {
    cardStarts.push(cardMatch.index);
  }

  for (let i = 0; i < cardStarts.length; i++) {
    const start = cardStarts[i];
    const end = i + 1 < cardStarts.length ? cardStarts[i + 1] : htmlChunk.length;
    const cardHtml = htmlChunk.slice(start, end);

    // Extract image
    const imgMatch = cardHtml.match(/<img\s+src="([^"]+)"/);
    const image = imgMatch ? imgMatch[1] : '';

    // Extract name
    const nameMatch = cardHtml.match(/<div class="p-name">([^<]+)<\/div>/);
    const name = nameMatch ? decodeEntities(nameMatch[1].trim()) : '';

    // Extract features
    const features = [];
    const featureRegex = /<li>([^<]+)<\/li>/g;
    let featureMatch;
    while ((featureMatch = featureRegex.exec(cardHtml)) !== null) {
      features.push(decodeEntities(featureMatch[1].trim()));
    }

    if (name) {
      const product = { name, image };
      if (features.length > 0) {
        product.features = features;
      } else {
        product.features = [];
      }
      products.push(product);
    }
  }

  return products;
}

// Build categories
const categories = [];

for (let i = 0; i < sections.length; i++) {
  const section = sections[i];
  const nextStart = i + 1 < sections.length ? sections[i + 1].startIndex : html.length;
  const sectionHtml = html.slice(section.startIndex, nextStart);
  const { icon, title } = parseTitle(section.rawTitle);
  const products = extractProducts(sectionHtml);

  categories.push({
    id: section.id,
    icon,
    title,
    products,
  });
}

const totalProducts = categories.reduce((sum, c) => sum + c.products.length, 0);

const output = {
  title: 'Full Product Catalog',
  description: `Complete listing of ${totalProducts} products across ${categories.length} categories.`,
  categories,
};

writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

// Print summary
console.log(`Wrote ${outputPath}`);
console.log(`Categories: ${categories.length}`);
console.log(`Total products: ${totalProducts}`);
console.log('');
console.log('Per category:');
for (const cat of categories) {
  const noFeatures = cat.products.filter((p) => p.features.length === 0).length;
  const suffix = noFeatures > 0 ? ` (${noFeatures} without features)` : '';
  console.log(`  [${cat.id}] ${cat.icon} ${cat.title}: ${cat.products.length} products${suffix}`);
}
