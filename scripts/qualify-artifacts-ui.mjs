import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const output = path.resolve('artifacts', 'local', 'TOMINAL-ARTIFACTS-X1', 'browser');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
const failures = [];
const check = (value, message) => { if (!value) failures.push(message); };

await page.goto(process.env.TOMINAL_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Wires', exact: true }).click();
await page.getByText('WIRE_MOTOR_POS', { exact: true }).last().click();
check(await page.getByText('conductor:WIRE_MOTOR_POS', { exact: true }).count(), 'Shared motor conductor selection missing in Wires.');
await page.screenshot({ path: path.join(output, 'wires.png'), fullPage: true });

await page.getByRole('button', { name: 'Formboard', exact: true }).click();
check(await page.getByText('conductor:WIRE_MOTOR_POS', { exact: true }).count(), 'Selected conductor missing in Formboard.');
check((await page.locator('[data-entity-id="SEG_MOTOR_OUT"]').getAttribute('stroke')) === '#0ea5e9', 'Selected route is not highlighted.');
await page.screenshot({ path: path.join(output, 'selected-conductor-formboard.png'), fullPage: true });

await page.getByRole('button', { name: 'BOM', exact: true }).click();
check(await page.getByText('23 grouped manufacturer-part rows · required quantity only').count(), 'BOM row count label missing.');
await page.screenshot({ path: path.join(output, 'bom.png'), fullPage: true });

await page.getByRole('button', { name: 'Quote', exact: true }).click();
check(await page.getByText(/Demo Estimate \/ Local Fixture Pricing/).count(), 'Demo quote label missing.');
check(await page.getByText(/Subtotal\s+USD 35.05/).count(), 'Quote subtotal missing.');
await page.screenshot({ path: path.join(output, 'quote.png'), fullPage: true });
await page.getByRole('button', { name: 'Refresh snapshot' }).click();
check(await page.getByText(/2026-09-15T12:00:01.000Z/).count(), 'Quote refresh did not replace the snapshot time.');

await page.getByRole('button', { name: 'Manufacturing', exact: true }).click();
check(await page.getByText('tominal.lock.toml', { exact: true }).count(), 'Lockfile is missing from Manufacturing.');
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export', exact: true }).nth(1).click();
const download = await downloadPromise;
check((await download.suggestedFilename()) === 'controller-chassis.cutlist.csv', 'Cut-list CSV browser export filename is wrong.');

const result = { failures, selectedConductor: 'WIRE_MOTOR_POS', quoteRefresh: '2026-09-15T12:00:01.000Z', exported: await download.suggestedFilename() };
await writeFile(path.join(output, 'qualification.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (failures.length) process.exitCode = 1;
