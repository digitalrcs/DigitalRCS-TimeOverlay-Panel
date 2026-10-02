import { test as base, expect } from '@grafana/plugin-e2e';
import { randomUUID } from 'node:crypto';
import type { Locator } from '@playwright/test';

const from = Date.UTC(2026, 7, 1);
const to = Date.UTC(2026, 7, 3);
const test = base.extend<{ zoomDashboard: { uid: string } }>({
  zoomDashboard: async ({ createDataSource, request }, use) => {
    const datasource = await createDataSource({ type: 'grafana-testdata-datasource', name: `Zoom QA ${randomUUID()}` });
    const uid = `zoom-${randomUUID().slice(0, 12)}`;
    const panels = [1, 2].map((id) => ({
      id,
      title: id === 1 ? 'Independent zoom' : 'Unchanged comparison',
      type: 'digitalrcs-timeoverlay-panel',
      gridPos: { x: (id - 1) * 12, y: 0, w: 12, h: 12 },
      datasource: { type: datasource.type, uid: datasource.uid },
      targets: [{ refId: 'A', scenarioId: 'csv_metric_values', stringInput: '20,23,28,30,27,22,15,12,10,14,19,25' }],
      options: { ranges: [], notes: [], showToolbar: true, showLegend: true },
      fieldConfig: { defaults: {}, overrides: [] },
    }));
    const response = await request.post('/api/dashboards/db', {
      data: {
        dashboard: {
          uid,
          title: `Time Overlay zoom QA ${uid}`,
          schemaVersion: 39,
          timezone: 'utc',
          refresh: '',
          time: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
          panels,
        },
      },
    });
    expect(response.ok()).toBeTruthy();
    try {
      await use({ uid });
    } finally {
      await request.delete(`/api/dashboards/uid/${uid}`);
      await request.delete(`/api/datasources/uid/${datasource.uid}`);
    }
  },
});

const view = async (panel: Locator) => ({
  from: Number(await panel.getAttribute('data-rendered-from')),
  to: Number(await panel.getAttribute('data-rendered-to')),
});

test('panel-only zoom isolates drag, buttons and reset without queries', async ({
  zoomDashboard,
  gotoDashboardPage,
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await gotoDashboardPage({ uid: zoomDashboard.uid });
  const panels = page.getByTestId('time-overlay-panel');
  await expect(panels).toHaveCount(2);
  const first = panels.nth(0);
  const second = panels.nth(1);
  await expect(first.locator('canvas').first()).toBeVisible();
  const original = await view(first);
  expect(original).toEqual({ from, to });
  const url = page.url();
  let queries = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/ds/query')) {
      queries++;
    }
  });
  await first.getByRole('button', { name: 'Zoom in 50 percent' }).click();
  await expect.poll(() => view(first)).toEqual({ from: from + (to - from) / 4, to: to - (to - from) / 4 });
  expect(await view(second)).toEqual(original);
  expect(page.url()).toBe(url);
  await first.getByRole('button', { name: 'Zoom out 50 percent' }).click();
  await expect.poll(async () => (await view(first)).to - (await view(first)).from).toBe((to - from) * 0.75);
  await first.getByRole('button', { name: 'Zoom all' }).click();
  await expect.poll(() => view(first)).toEqual(original);
  const bounds = await first.locator('.u-over').boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width * 0.25, bounds!.y + bounds!.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * 0.65, bounds!.y + bounds!.height * 0.6, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await view(first)).to - (await view(first)).from).toBeLessThan((to - from) / 2);
  expect(await view(second)).toEqual(original);
  expect(page.url()).toBe(url);
  if (process.env.ZOOM_QA_SCREENSHOT) {
    await page.screenshot({ path: process.env.ZOOM_QA_SCREENSHOT });
  }
  await first.locator('.u-over').dblclick({ position: { x: bounds!.width * 0.5, y: bounds!.height * 0.6 } });
  await first.getByRole('button', { name: 'Zoom all' }).click();
  await expect.poll(() => view(first)).toEqual(original);
  expect(queries).toBe(0);
  expect(errors).toEqual([]);
  await testInfo.attach('isolated-zoom-result', {
    body: JSON.stringify({
      original,
      comparison: await view(second),
      queries,
      errors,
      urlUnchanged: page.url() === url,
    }),
    contentType: 'application/json',
  });
});

test('zoom behavior option switches to dashboard zoom and resets local viewport', async ({
  zoomDashboard,
  gotoPanelEditPage,
  page,
}) => {
  const editor = await gotoPanelEditPage({ dashboard: zoomDashboard, id: '1' });
  const panel = page.getByTestId('time-overlay-panel');
  await panel.getByRole('button', { name: 'Zoom in 50 percent' }).click();
  await expect.poll(async () => (await view(panel)).from).toBeGreaterThan(from);
  const options = editor.getCustomOptions('DigitalRCS-TimeOverlay-Panel');
  await options.getRadioGroup('Zoom behavior').check('Entire dashboard');
  await expect(panel).toHaveAttribute('data-zoom-mode', 'dashboard');
  await expect.poll(() => view(panel)).toEqual({ from, to });
  await panel.getByRole('button', { name: 'Zoom in 50 percent' }).click();
  await expect
    .poll(() => {
      const value = new URL(page.url()).searchParams.get('from')!;
      return /^\d+$/.test(value) ? Number(value) : Date.parse(value);
    })
    .toBe(from + (to - from) / 4);
  await panel.getByRole('button', { name: 'Zoom all' }).click();
  await expect.poll(() => view(panel)).toEqual({ from, to });
  await options.getRadioGroup('Zoom behavior').check('This panel only');
  await expect(panel).toHaveAttribute('data-zoom-mode', 'panel');
});

test('overlays survive local zoom and dashboard time changes reset the viewport', async ({
  zoomDashboard,
  gotoDashboardPage,
  page,
  request,
}) => {
  const saved = await (await request.get(`/api/dashboards/uid/${zoomDashboard.uid}`)).json();
  saved.dashboard.panels[0].options.ranges = [
    { id: 'existing-range', from: from + (to - from) * 0.05, to: from + (to - from) * 0.2 },
  ];
  expect(
    (await request.post('/api/dashboards/db', { data: { dashboard: saved.dashboard, overwrite: true } })).ok()
  ).toBeTruthy();
  const dashboard = await gotoDashboardPage({ uid: zoomDashboard.uid });
  const panel = page.getByTestId('time-overlay-panel').first();
  await expect(panel.getByTestId('time-range-overlay')).toHaveCount(1);
  const duration = panel.getByRole('textbox', { name: 'Range duration' });
  const originalDuration = await duration.inputValue();
  await panel.getByRole('button', { name: 'Select an area to zoom' }).click();
  await duration.click();
  await expect(duration).toBeFocused();
  await panel.getByRole('button', { name: 'Zoom in 50 percent' }).click();
  await expect(panel.getByTestId('time-range-overlay')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Zoom all' }).click();
  await expect(duration).toHaveValue(originalDuration);
  await panel.getByRole('button', { name: 'Add note' }).click();
  const note = panel.getByRole('textbox', { name: 'Note text' });
  await note.fill('Local zoom preserves this note');
  await panel.getByRole('button', { name: 'Zoom in 50 percent' }).click();
  await expect(note).toHaveValue('Local zoom preserves this note');
  await dashboard.timeRange.set({ from: '2026-08-01 06:00:00', to: '2026-08-02 18:00:00' });
  const updated = { from: from + 6 * 3_600_000, to: to - 6 * 3_600_000 };
  await expect.poll(() => view(panel)).toEqual(updated);
  await expect.poll(() => view(page.getByTestId('time-overlay-panel').nth(1))).toEqual(updated);
  await panel.getByRole('button', { name: 'Zoom in 50 percent' }).click();
  await panel.getByRole('button', { name: 'Zoom all' }).click();
  await expect.poll(() => view(panel)).toEqual(updated);
});
