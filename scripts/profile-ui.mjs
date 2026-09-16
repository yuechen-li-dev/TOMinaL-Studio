import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const baseUrl = process.env.TOMINAL_URL ?? 'http://127.0.0.1:5173/';
const label = process.env.TOMINAL_PROFILE_LABEL ?? 'baseline';
const outputDirectory = path.resolve('artifacts', 'local', 'ui-x1', label);
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding']
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('console', (message) => console.log('browser console', message.type(), message.text()));
page.on('pageerror', (error) => console.log('browser error', error.stack));

await page.addInitScript(() => {
  const activity = {
    animationFrameCallbacks: 0,
    intervalCallbacks: 0,
    timeoutCallbacks: 0,
    reactCommits: 0,
    rendersByComponent: {}
  };
  Object.defineProperty(window, '__tominalActivity', { value: activity });

  const requestAnimationFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => requestAnimationFrame((time) => {
    activity.animationFrameCallbacks += 1;
    callback(time);
  });

  const setInterval = window.setInterval.bind(window);
  window.setInterval = (callback, delay, ...args) => setInterval((...callbackArgs) => {
    activity.intervalCallbacks += 1;
    if (typeof callback === 'function') callback(...callbackArgs);
  }, delay, ...args);

  const setTimeout = window.setTimeout.bind(window);
  window.setTimeout = (callback, delay, ...args) => setTimeout((...callbackArgs) => {
    activity.timeoutCallbacks += 1;
    if (typeof callback === 'function') callback(...callbackArgs);
  }, delay, ...args);

  const hook = {
    supportsFiber: true,
    renderers: new Map(),
    inject(renderer) {
      this.renderers.set(1, renderer);
      return 1;
    },
    onCommitFiberRoot(_rendererId, root) {
      activity.reactCommits += 1;
      const visit = (fiber) => {
        if ((fiber.flags & 1) !== 0) {
          const component = fiber.elementType ?? fiber.type;
          const name = typeof component === 'string'
            ? component
            : component?.displayName ?? component?.name;
          if (name) activity.rendersByComponent[name] = (activity.rendersByComponent[name] ?? 0) + 1;
        }
        if (fiber.child) visit(fiber.child);
        if (fiber.sibling) visit(fiber.sibling);
      };
      visit(root.current);
    },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {}
  };
  Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', { value: hook });
});

const client = await page.context().newCDPSession(page);
await client.send('Performance.enable');

const readActivity = () => page.evaluate(() => structuredClone(window.__tominalActivity));
const readMetrics = async () => {
  const response = await client.send('Performance.getMetrics');
  return Object.fromEntries(response.metrics.map(({ name, value }) => [name, value]));
};

const subtractRecords = (after, before) => {
  const result = {};
  for (const [key, value] of Object.entries(after)) {
    if (typeof value === 'number') result[key] = value - (before[key] ?? 0);
  }
  return result;
};

const subtractActivity = (after, before) => ({
  animationFrameCallbacks: after.animationFrameCallbacks - before.animationFrameCallbacks,
  intervalCallbacks: after.intervalCallbacks - before.intervalCallbacks,
  timeoutCallbacks: after.timeoutCallbacks - before.timeoutCallbacks,
  reactCommits: after.reactCommits - before.reactCommits,
  rendersByComponent: subtractRecords(after.rendersByComponent, before.rendersByComponent)
});

const sample = async (name, durationMs = 3000) => {
  const activityBefore = await readActivity();
  const metricsBefore = await readMetrics();
  await page.waitForTimeout(durationMs);
  const activityAfter = await readActivity();
  const metricsAfter = await readMetrics();
  return {
    name,
    durationMs,
    activity: subtractActivity(activityAfter, activityBefore),
    metrics: {
      taskDurationSeconds: metricsAfter.TaskDuration - metricsBefore.TaskDuration,
      scriptDurationSeconds: metricsAfter.ScriptDuration - metricsBefore.ScriptDuration,
      layoutDurationSeconds: metricsAfter.LayoutDuration - metricsBefore.LayoutDuration,
      recalcStyleDurationSeconds: metricsAfter.RecalcStyleDuration - metricsBefore.RecalcStyleDuration,
      layoutCount: metricsAfter.LayoutCount - metricsBefore.LayoutCount,
      recalcStyleCount: metricsAfter.RecalcStyleCount - metricsBefore.RecalcStyleCount,
      jsHeapUsedBytes: metricsAfter.JSHeapUsedSize
    }
  };
};

const selectTab = async (...names) => {
  for (const name of names) {
    const button = page.getByRole('button', { name, exact: true });
    if (await button.count()) {
      await button.click();
      await page.waitForTimeout(250);
      return;
    }
  }
  throw new Error(`No workspace button found for ${names.join(' or ')}`);
};

await page.goto(baseUrl, { waitUntil: 'networkidle' });
const results = [];
results.push(await sample('logical-idle'));
await page.screenshot({ path: path.join(outputDirectory, 'logical.png'), fullPage: true });

await selectTab('Formboard');
results.push(await sample('formboard-idle'));
await page.screenshot({ path: path.join(outputDirectory, 'formboard.png'), fullPage: true });

for (const workspace of ['Wires', 'BOM', 'Quote', 'Manufacturing']) {
  await selectTab(workspace);
  results.push(await sample(`${workspace.toLowerCase()}-idle`));
}

await selectTab('Catalog', 'Material Catalog');
results.push(await sample('catalog-idle'));
await page.screenshot({ path: path.join(outputDirectory, 'catalog.png'), fullPage: true });

const activityBeforeSwitches = await readActivity();
const metricsBeforeSwitches = await readMetrics();
for (const tab of [['Logical', 'Graph'], ['Formboard'], ['Wires'], ['BOM'], ['Quote'], ['Manufacturing'], ['Catalog', 'Material Catalog'], ['Logical', 'Graph']]) {
  await selectTab(...tab);
}
const activityAfterSwitches = await readActivity();
const metricsAfterSwitches = await readMetrics();
results.push({
  name: 'repeated-tab-switching',
  activity: subtractActivity(activityAfterSwitches, activityBeforeSwitches),
  metrics: {
    taskDurationSeconds: metricsAfterSwitches.TaskDuration - metricsBeforeSwitches.TaskDuration,
    scriptDurationSeconds: metricsAfterSwitches.ScriptDuration - metricsBeforeSwitches.ScriptDuration,
    layoutDurationSeconds: metricsAfterSwitches.LayoutDuration - metricsBeforeSwitches.LayoutDuration,
    recalcStyleDurationSeconds: metricsAfterSwitches.RecalcStyleDuration - metricsBeforeSwitches.RecalcStyleDuration,
    layoutCount: metricsAfterSwitches.LayoutCount - metricsBeforeSwitches.LayoutCount,
    recalcStyleCount: metricsAfterSwitches.RecalcStyleCount - metricsBeforeSwitches.RecalcStyleCount,
    jsHeapUsedBytes: metricsAfterSwitches.JSHeapUsedSize
  }
});

await writeFile(path.join(outputDirectory, 'profile.json'), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));

await browser.close();

