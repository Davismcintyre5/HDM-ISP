#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SOURCE = path.join(PUBLIC, 'logo.svg');

function readEnv(key, fallback) {
  const v = process.env[key];
  return v && String(v).trim() ? String(v).trim() : fallback;
}

const BRAND = {
  name: readEnv('VITE_APP_NAME', 'HDM Provider'),
  shortName: readEnv(
    'VITE_APP_SHORT_NAME',
    readEnv('VITE_APP_NAME', 'HDM').split(/\s+/)[0].slice(0, 12)
  ),
  description: readEnv(
    'VITE_APP_DESCRIPTION',
    'Hotspot billing and voucher management for Kenyan ISPs.'
  ),
  themeColor: readEnv('VITE_APP_THEME_COLOR', '#2563eb'),
  background: readEnv('VITE_APP_BACKGROUND_COLOR', '#ffffff'),
  darkBackground: readEnv('VITE_APP_DARK_BACKGROUND', '#0f172a'),
  startUrl: readEnv('VITE_APP_START_URL', '/dashboard'),
};

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const EXTRA_SIZES = [48, 64, 256, 1024];
const APPLE_SIZES = [120, 152, 167, 180, 1024];
const MASKABLE_SIZES = [192, 512];
const SPLASH_SIZES = [
  [640, 1136],
  [750, 1334],
  [828, 1792],
  [1125, 2436],
  [1170, 2532],
  [1179, 2556],
  [1242, 2208],
  [1284, 2778],
  [1290, 2796],
  [1536, 2048],
  [1668, 2224],
  [1668, 2388],
  [2048, 2732],
];

async function ensureSource() {
  try {
    await fs.access(SOURCE);
  } catch {
    throw new Error(
      `Missing ${path.relative(ROOT, SOURCE)}. Add a square SVG logo to public/logo.svg first.`
    );
  }
}

async function renderSquare(buffer, width, opts = {}) {
  const { background = null, padding = 0 } = opts;
  const inner = Math.max(1, width - padding * 2);

  const logo = await sharp(buffer)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  if (!background) {
    if (padding === 0) return logo;
    return sharp({
      create: {
        width,
        height: width,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: logo, top: padding, left: padding }])
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  return sharp({
    create: { width, height: width, channels: 4, background },
  })
    .composite([{ input: logo, top: padding, left: padding }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function renderRect(buffer, width, height, opts = {}) {
  const { background = null, logoRatio = 0.4 } = opts;
  const logoSize = Math.round(Math.min(width, height) * logoRatio);

  const logo = await sharp(buffer)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const bg = background || { r: 255, g: 255, b: 255, alpha: 1 };

  return sharp({
    create: { width, height, channels: 4, background: bg },
  })
    .composite([
      {
        input: logo,
        top: Math.round((height - logoSize) / 2),
        left: Math.round((width - logoSize) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function writePng(buffer, filename) {
  const target = path.join(PUBLIC, filename);
  await fs.writeFile(target, buffer);
  const kb = (buffer.length / 1024).toFixed(1);
  console.log(`  ✓ ${filename.padEnd(30)} ${kb.padStart(7)} KB`);
}

async function generatePwaIcons(svg) {
  console.log('\nPWA icons:');
  for (const size of [...PWA_SIZES, ...EXTRA_SIZES].sort((a, b) => a - b)) {
    const png = await renderSquare(svg, size, {
      padding: Math.round(size * 0.1),
    });
    await writePng(png, `icon-${size}.png`);
  }
}

async function generateMaskable(svg) {
  console.log('\nMaskable icons:');
  for (const size of MASKABLE_SIZES) {
    const png = await renderSquare(svg, size, {
      background: BRAND.themeColor,
      padding: Math.round(size * 0.2),
    });
    await writePng(png, `maskable-${size}.png`);
  }
}

async function generateApple(svg) {
  console.log('\nApple touch icons:');
  for (const size of APPLE_SIZES) {
    const png = await renderSquare(svg, size, {
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      padding: Math.round(size * 0.08),
    });
    await writePng(
      png,
      size === 1024 ? `apple-touch-icon-1024.png` : `apple-touch-icon-${size}.png`
    );
  }
  const main = await renderSquare(svg, 180, {
    background: { r: 255, g: 255, b: 255, alpha: 1 },
    padding: 14,
  });
  await writePng(main, 'apple-touch-icon.png');
}

async function generateFavicons(svg) {
  console.log('\nFavicons:');
  for (const size of [16, 32, 48, 64]) {
    const png = await renderSquare(svg, size, {
      padding: Math.max(1, Math.round(size * 0.06)),
    });
    await writePng(png, `favicon-${size}.png`);
  }
  await fs.copyFile(SOURCE, path.join(PUBLIC, 'favicon.svg'));
  console.log(`  ✓ favicon.svg                   (copied)`);
}

async function generateMstile(svg) {
  console.log('\nWindows tiles:');
  for (const size of [70, 150, 310]) {
    const png = await renderSquare(svg, size, {
      background: BRAND.themeColor,
      padding: Math.round(size * 0.15),
    });
    await writePng(png, `mstile-${size}x${size}.png`);
  }
  const wide = await renderRect(svg, 310, 150, {
    background: BRAND.themeColor,
    logoRatio: 0.6,
  });
  await writePng(wide, 'mstile-310x150.png');
}

async function generateSplash(svg) {
  console.log('\niOS splash screens:');
  for (const [w, h] of SPLASH_SIZES) {
    const png = await renderRect(svg, w, h, {
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      logoRatio: 0.28,
    });
    await writePng(png, `splash-${w}x${h}.png`);
  }
}

async function generateOg(svg) {
  console.log('\nOpen Graph image:');
  const width = 1200;
  const height = 630;
  const logoSize = 320;

  const logo = await sharp(svg)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${BRAND.themeColor}"/>
      <text x="50%" y="${height - 80}" text-anchor="middle"
            font-family="Inter, system-ui, sans-serif" font-size="52"
            font-weight="700" fill="#ffffff">${escapeXml(BRAND.name)}</text>
    </svg>
  `);

  const png = await sharp(overlay)
    .composite([
      {
        input: logo,
        top: Math.round((height - logoSize) / 2 - 60),
        left: Math.round((width - logoSize) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writePng(png, 'og-image.png');
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildManifest() {
  const anyIcons = [...PWA_SIZES, ...EXTRA_SIZES]
    .sort((a, b) => a - b)
    .map((s) => ({
      src: `/icon-${s}.png`,
      sizes: `${s}x${s}`,
      type: 'image/png',
      purpose: 'any',
    }));

  const maskableIcons = MASKABLE_SIZES.map((s) => ({
    src: `/maskable-${s}.png`,
    sizes: `${s}x${s}`,
    type: 'image/png',
    purpose: 'maskable',
  }));

  return {
    id: '/',
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    start_url: BRAND.startUrl,
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: BRAND.background,
    theme_color: BRAND.themeColor,
    lang: 'en-KE',
    dir: 'ltr',
    categories: ['business', 'productivity', 'utilities'],
    prefer_related_applications: false,
    icons: [...anyIcons, ...maskableIcons],
    shortcuts: [
      {
        name: 'Generate vouchers',
        short_name: 'Vouchers',
        url: '/vouchers',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Customers',
        short_name: 'Customers',
        url: '/customers',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Billing',
        short_name: 'Billing',
        url: '/billing',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}

async function writeManifest() {
  console.log('\nManifest files:');
  const manifest = buildManifest();
  const target = path.join(PUBLIC, 'manifest.webmanifest');
  await fs.writeFile(target, JSON.stringify(manifest, null, 2));
  console.log(`  ✓ manifest.webmanifest          (${manifest.name})`);

  const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="/mstile-70x70.png"/>
      <square150x150logo src="/mstile-150x150.png"/>
      <square310x310logo src="/mstile-310x310.png"/>
      <wide310x150logo src="/mstile-310x150.png"/>
      <TileColor>${BRAND.themeColor}</TileColor>
    </tile>
  </msapplication>
</browserconfig>
`;
  await fs.writeFile(path.join(PUBLIC, 'browserconfig.xml'), browserConfig);
  console.log('  ✓ browserconfig.xml');
}

async function main() {
  console.log(`Generating PWA assets for "${BRAND.name}"`);
  console.log(`  short_name: ${BRAND.shortName}`);
  console.log(`  theme:      ${BRAND.themeColor}`);
  console.log(`  start_url:  ${BRAND.startUrl}`);

  await ensureSource();
  const svg = await fs.readFile(SOURCE);

  await generatePwaIcons(svg);
  await generateMaskable(svg);
  await generateApple(svg);
  await generateFavicons(svg);
  await generateMstile(svg);
  await generateSplash(svg);
  await generateOg(svg);
  await writeManifest();

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});