import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.resolve(__dirname, '../../src/content/products');
const CATEGORIES = ['military', 'railway', 'industrial', 'telecom', 'sensor', 'hpc'];

describe('Content Collections: Products', () => {
  it('has JSON files for all 6 categories', () => {
    for (const cat of CATEGORIES) {
      const filePath = path.join(CONTENT_DIR, `${cat}.json`);
      expect(fs.existsSync(filePath), `Missing: ${cat}.json`).toBe(true);
    }
  });

  for (const cat of CATEGORIES) {
    describe(`${cat}.json`, () => {
      const filePath = path.join(CONTENT_DIR, `${cat}.json`);

      it('is valid JSON', () => {
        const raw = fs.readFileSync(filePath, 'utf-8');
        expect(() => JSON.parse(raw)).not.toThrow();
      });

      it('has required fields', () => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(data.category).toBe(cat);
        expect(data.title).toBeTruthy();
        expect(data.pageTitle).toBeTruthy();
        expect(data.description).toBeTruthy();
        expect(Array.isArray(data.items)).toBe(true);
        expect(data.items.length).toBeGreaterThan(0);
      });

      it('items have name and specs', () => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        for (const item of data.items) {
          expect(item.name, `item missing name in ${cat}`).toBeTruthy();
          expect(item.specs, `item missing specs in ${cat}: ${item.name}`).toBeTruthy();
        }
      });
    });
  }
});
