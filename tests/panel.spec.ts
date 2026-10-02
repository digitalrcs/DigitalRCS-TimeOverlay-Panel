import { test, expect } from '@grafana/plugin-e2e';

test('explains the required fields when panel data is empty', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '2' });
  await expect(panelEditPage.panel.locator).toContainText('needs a Grafana time field and at least one numeric field');
});

test('renders dynamically named CSV series and its legend', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  await expect(page.getByTestId('time-overlay-panel')).toBeVisible();
  await expect(panelEditPage.panel.locator).toContainText('USTX01');
  await expect(panelEditPage.panel.locator).toContainText('UXVA01');
});

test('draws a persistent duration overlay', async ({ gotoDashboardPage, readProvisionedDashboard, page }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  await gotoDashboardPage({ uid: dashboard.uid });
  const panel = page.getByTestId('time-overlay-panel').filter({ has: page.getByTestId('plot-area') }).first();

  await panel.getByRole('button', { name: 'Draw time range' }).click();
  const plot = panel.getByTestId('plot-area');
  const ranges = panel.getByTestId('time-range-overlay');
  const initialRangeCount = await ranges.count();
  const bounds = await plot.boundingBox();
  if (!bounds) {
    throw new Error('Plot area has no bounding box');
  }
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.5);
  await page.mouse.up();

  await expect(ranges).toHaveCount(initialRangeCount + 1);

  const range = ranges.last();
  const duration = panel.getByRole('textbox', { name: 'Range duration' }).last();
  await expect(range).toBeVisible();
  await expect(duration).not.toHaveValue('');
  const initialBounds = await range.boundingBox();
  // A real click catches inputs that inherit pointer-events: none from the plot.
  await panel.getByRole('button', { name: 'Select an area to zoom' }).click();
  await duration.click();
  await expect(duration).toBeFocused();
  await duration.press('ControlOrMeta+A');
  await duration.pressSequentially('1d 2h 30m');
  await duration.press('Enter');
  await expect(duration).toHaveValue('1d 2h 30m');
  const resizedBounds = await range.boundingBox();
  expect(initialBounds).not.toBeNull();
  expect(resizedBounds).not.toBeNull();
  expect(resizedBounds!.width).toBeLessThan(initialBounds!.width);

  await panel.getByRole('button', { name: 'Draw time range' }).click();
  await duration.click();
  await expect(duration).toBeFocused();
  await duration.press('ControlOrMeta+A');
  await duration.pressSequentially('12h');
  await duration.press('Tab');
  await expect(duration).toHaveValue('12h 0m 0s');
  const smallerBounds = await range.boundingBox();
  expect(smallerBounds).not.toBeNull();
  expect(smallerBounds!.width).toBeLessThan(resizedBounds!.width);
  await expect(ranges).toHaveCount(initialRangeCount + 1);
});

test('adds and edits a note overlay', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  await gotoPanelEditPage({ dashboard, id: '1' });

  await page.getByRole('button', { name: 'Add note' }).click();
  const note = page.getByTestId('note-overlay');
  await expect(note).toBeVisible();
  await note.getByRole('textbox', { name: 'Note text' }).fill('Pump maintenance completed');
  await expect(note.getByRole('textbox', { name: 'Note text' })).toHaveValue('Pump maintenance completed');
});
