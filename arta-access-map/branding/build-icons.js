// Παράγει το λογότυπο σε όλα τα μεγέθη (web, Android). Χρειάζεται Playwright (Chromium).
// Χρήση: node branding/build-icons.js
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { BG, BG_RECT, BRIDGE, PIN } = require('./logo-parts');

const here = __dirname;
const svg = (inner, { bg = true, scale = 1, radius = 0 } = {}) => {
  const t = scale === 1 ? '' : ` transform="translate(${256 - 256 * scale},${256 - 256 * scale}) scale(${scale})"`;
  const clip = radius ? `<clipPath id="r"><rect width="512" height="512" rx="${radius}"/></clipPath>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${BG}${clip}<g${radius ? ' clip-path="url(#r)"' : ''}>${bg ? BG_RECT : ''}<g${t}>${inner}</g></g></svg>`;
};
const FULL = PIN + BRIDGE;

const outputs = {
  // Κύριο λογότυπο (τετράγωνο με στρογγυλεμένες γωνίες) και εκδοχές
  'logo.svg': svg(FULL, { radius: 96 }),
  'logo-square.svg': svg(FULL),
  'logo-maskable.svg': svg(FULL, { scale: 0.78 }),
  'logo-foreground.svg': svg(FULL, { bg: false, scale: 0.62 }),
  'logo-background.svg': svg('', {}),
};
for (const [f, s] of Object.entries(outputs)) fs.writeFileSync(path.join(here, f), s);

const pngs = [
  // web / PWA
  ['logo.svg', 'web/icon-192.png', 192], ['logo.svg', 'web/icon-512.png', 512],
  ['logo-maskable.svg', 'web/icon-maskable-512.png', 512], ['logo-square.svg', 'web/apple-touch-icon.png', 180],
  ['logo.svg', 'web/favicon-32.png', 32],
];
// Android: παλιό εικονίδιο (48dp) και adaptive foreground/background (108dp)
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  pngs.push(['logo.svg', `android/mipmap-${d}/ic_launcher.png`, 48 * k]);
  pngs.push(['logo-round.svg', `android/mipmap-${d}/ic_launcher_round.png`, 48 * k]);
  pngs.push(['logo-foreground.svg', `android/mipmap-${d}/ic_launcher_foreground.png`, 108 * k]);
  pngs.push(['logo-background.svg', `android/mipmap-${d}/ic_launcher_background.png`, 108 * k]);
}
fs.writeFileSync(path.join(here, 'logo-round.svg'), svg(FULL, { radius: 256 }));

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();
  for (const [src, out, size] of pngs) {
    const file = path.join(here, out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${fs.readFileSync(path.join(here, src), 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  await b.close();
  console.log(`${pngs.length} PNG έτοιμα`);
})();
