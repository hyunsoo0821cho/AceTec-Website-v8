import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = [
  { path: '/', name: 'Home' },
  { path: '/solutions', name: 'Solutions' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/history', name: 'History' },
  { path: '/applications', name: 'Applications' },
  { path: '/products/military', name: 'Products: Military' },
  { path: '/products/railway', name: 'Products: Railway' },
  { path: '/products/industrial', name: 'Products: Industrial' },
  { path: '/products/hpc', name: 'Products: HPC' },
];

for (const { path, name } of pages) {
  test(`${name} (${path}) has no critical a11y violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast', 'aria-hidden-focus']) // color-contrast needs visual review, aria-hidden-focus is false positive on inert mobile menu
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');

    if (critical.length > 0) {
      const summary = critical.map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} instances)`).join('\n');
      expect(critical, `A11y violations on ${name}:\n${summary}`).toHaveLength(0);
    }
  });
}

test('Chat widget is accessible', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Pill button has aria-label
  const pill = page.locator('#chatPill');
  await expect(pill).toHaveAttribute('aria-label');

  // Click to open
  await pill.click();
  await page.waitForTimeout(500);

  // Panel is dialog with aria-label
  const panel = page.locator('#chatPanel');
  await expect(panel).toHaveAttribute('role', 'dialog');
  await expect(panel).toHaveAttribute('aria-label');

  // Message container has aria-live
  const messages = page.locator('#chatMessages');
  await expect(messages).toHaveAttribute('aria-live', 'polite');

  // Close button has aria-label
  const close = page.locator('#chatClose');
  await expect(close).toHaveAttribute('aria-label');

  // Input is focusable
  const input = page.locator('#chatInput');
  await expect(input).toBeFocused();
});
