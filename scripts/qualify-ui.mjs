import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

const outputDirectory = path.resolve('artifacts', 'local', 'ui-x1', 'qualification');
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

await page.goto(process.env.TOMINAL_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'WIRE_MOTOR_POS', exact: true }).click();
check((await page.getByText('Physical route').locator('..').textContent())?.includes('ROUTE_MOTOR'), 'Inspector did not resolve conductor route.');
await page.screenshot({ path: path.join(outputDirectory, 'logical-selected-conductor.png'), fullPage: true });

await page.getByRole('button', { name: 'Formboard', exact: true }).click();
await page.getByLabel('1:1 harness formboard').waitFor();
const selectedPath = page.locator('[data-entity-id="SEG_MOTOR_OUT"]');
check((await selectedPath.getAttribute('stroke')) === '#0ea5e9', 'Selected conductor route was not highlighted on Formboard.');
await page.screenshot({ path: path.join(outputDirectory, 'formboard-selected-conductor.png'), fullPage: true });

const motorRouteButton = page.getByRole('button', { name: /ROUTE_MOTOR.*mm/ });
const beforeText = await motorRouteButton.textContent();
const svg = page.getByLabel('1:1 harness formboard');
const bounds = await svg.boundingBox();
if (!bounds) throw new Error('Formboard SVG has no browser bounds.');
const panelMotor = page.locator('[data-entity-id="PANEL_MOTOR"]');
const panelBox = await panelMotor.boundingBox();
if (!panelBox) throw new Error('PANEL_MOTOR has no browser bounds.');
const eightyMillimetersInPixels = (80 / 900) * bounds.width;
await page.mouse.move(panelBox.x + panelBox.width / 2, panelBox.y + panelBox.height / 2);
await page.mouse.down();
await page.mouse.move(panelBox.x + panelBox.width / 2 + eightyMillimetersInPixels, panelBox.y + panelBox.height / 2, { steps: 8 });
await page.mouse.up();
const afterText = await motorRouteButton.textContent();
check(beforeText !== afterText, 'PANEL_MOTOR drag did not update the geometry-derived route length.');

await page.getByRole('button', { name: 'SEG_MOTOR_OUT', exact: true }).click();
const knot = page.getByRole('button', { name: /Move spline knot 2 of SEG_MOTOR_OUT/ });
const knotBox = await knot.boundingBox();
if (!knotBox) throw new Error('Spline knot has no browser bounds.');
await page.mouse.move(knotBox.x + knotBox.width / 2, knotBox.y + knotBox.height / 2);
await page.mouse.down();
await page.mouse.move(knotBox.x + knotBox.width / 2, knotBox.y + knotBox.height / 2 + 16, { steps: 4 });
await page.mouse.up();
check(afterText !== await motorRouteButton.textContent(), 'Spline-knot drag did not update route length.');

await page.getByRole('button', { name: 'Zoom in' }).click();
await page.getByRole('button', { name: 'Fit board' }).click();
await page.setViewportSize({ width: 1280, height: 800 });
check((await page.getByLabel('1:1 harness formboard').boundingBox())?.width > 300, 'Formboard did not survive resize.');

const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export 1:1 SVG' }).click();
const download = await downloadPromise;
check((await download.suggestedFilename()).endsWith('-formboard.svg'), 'Formboard export filename was not an SVG.');

await page.getByRole('button', { name: 'Catalog', exact: true }).click();
await page.getByRole('button', { name: 'New Wire Type' }).waitFor();
check(await page.getByRole('button', { name: 'New Wire Type' }).isVisible(), 'Catalog basic edit action is not visible.');
await page.screenshot({ path: path.join(outputDirectory, 'catalog.png'), fullPage: true });

const result = { beforeMotorRoute: beforeText?.trim(), afterConnectorDrag: afterText?.trim(), failures };
await writeFile(path.join(outputDirectory, 'qualification.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
