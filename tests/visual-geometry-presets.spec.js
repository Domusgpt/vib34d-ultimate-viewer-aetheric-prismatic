// @ts-check
const { test, expect } = require('@playwright/test');

const SYSTEMS = [
  { name: 'faceted', selector: '.system-btn[data-system="faceted"]', expectedCount: 10 },
  { name: 'quantum', selector: '.system-btn[data-system="quantum"]', expectedCount: 10 },
  { name: 'holographic', selector: '.system-btn[data-system="holographic"]', expectedCount: 10 },
];

test.describe('Visual Geometry Preset Documentation Agent', () => {
  test('captures geometry coverage and metadata for each visualizer', async ({ page }) => {
    console.log('🛰️ Geometry Documentation Agent: Navigating to VIB34D interface');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.geom-btn', { timeout: 30000 });

    for (const system of SYSTEMS) {
      await test.step(`Document ${system.name} geometry grid`, async () => {
        if (system.name !== 'faceted') {
          console.log(`🔀 Switching to ${system.name} system`);
          await page.click(system.selector);
          await page.waitForTimeout(1500);
        }

        await page.waitForFunction(
          expected => document.querySelectorAll('.geom-btn').length === expected,
          system.expectedCount,
          { timeout: 10000 }
        );

        const geometryButtons = page.locator('.geom-btn');
        await expect(geometryButtons).toHaveCount(system.expectedCount);

        const labels = (await geometryButtons.allTextContents()).map(label => label.trim());
        console.log(`📐 ${system.name} geometries: ${labels.join(', ')}`);

        await page.locator('#geometrySection').screenshot({
          path: `test-results/geometry-grid-${system.name}.png`,
          animations: 'disabled',
        });

        const metadata = await page.evaluate(() => {
          const systemManager = window.systemManager;
          if (!systemManager) return null;

          const currentSystem = systemManager.getCurrentSystem();
          const engine = currentSystem?.engine;

          const buttons = Array.from(document.querySelectorAll('.geom-btn')).map(btn => ({
            label: btn.textContent?.trim() || '',
            geometry: btn.dataset.geometry ?? null,
            variant: btn.dataset.variant ?? null,
          }));

          const defaultVariationCount = engine?.variationManager?.defaultVariationCount;
          const totalVariations = engine?.variationManager?.totalVariations;
          const presetCount = engine?.parameterManager?.getPresetVariationCount?.();

          return {
            buttons,
            defaultVariationCount,
            totalVariations,
            presetCount,
          };
        });

        console.log(`🧾 ${system.name} metadata:`, metadata);

        const geometryDataset = metadata?.buttons
          ?.map(button => button.geometry)
          .filter(value => value !== null && value !== undefined);

        if (geometryDataset && geometryDataset.length === system.expectedCount) {
          const uniqueGeometryCount = new Set(geometryDataset).size;
          await expect(uniqueGeometryCount).toBe(system.expectedCount);
        }

        if (system.name === 'faceted') {
          await expect(metadata?.defaultVariationCount).toBe(38);
          await expect(metadata?.presetCount).toBe(38);
        }
      });
    }
  });
});
