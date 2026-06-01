// build-qr.js — generates the App Store QR with the AmiFit logo in the center.
// Mirrors the in-app look from amifit-ios/AmiFit/DiaryUserFoodQRGenerator.swift:
//   error correction "H", white background, ~15% logo on a white disc with a soft shadow.
// Encodes the permanent App Store URL (the app's numeric Apple ID never changes).
// Run: node build-qr.js  →  assets/img/qr-code.png

const path = require('path');
const QRCode = require('qrcode');
const sharp = require('sharp');

const APP_STORE_URL = 'https://apps.apple.com/app/id6761309128';
const SIZE = 1000;                          // output canvas (px)
const LOGO = Math.round(SIZE * 0.15);       // 15% logo, same as the app
const DISC = Math.round(LOGO * 1.1);        // white knockout disc behind the logo (tight, like the app)
const LOGO_SRC = path.join(__dirname, 'assets/img/amifit_no_bg_light.png');
const OUT = path.join(__dirname, 'assets/img/qr-code.png');

async function main() {
  // 1. Base QR — highest error correction so the center logo doesn't break scanning.
  const qr = await QRCode.toBuffer(APP_STORE_URL, {
    errorCorrectionLevel: 'H',
    type: 'png',
    width: SIZE,
    margin: 4,                              // standard quiet zone
    color: { dark: '#000000ff', light: '#ffffffff' },
  });

  // 2. White disc with the same soft drop shadow the app draws (offset 0/2, blur 4, black @20%).
  const r = DISC / 2;
  const c = SIZE / 2;
  const disc = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
           <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.2"/>
         </filter>
       </defs>
       <circle cx="${c}" cy="${c}" r="${r}" fill="#ffffff" filter="url(#s)"/>
     </svg>`
  );

  // 3. Logo, sized to 15% and centered.
  const logo = await sharp(LOGO_SRC)
    .resize(LOGO, LOGO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const offset = Math.round((SIZE - LOGO) / 2);

  await sharp(qr)
    .composite([
      { input: disc, top: 0, left: 0 },
      { input: logo, top: offset, left: offset },
    ])
    .png()
    .toFile(OUT);

  console.log(`Wrote ${OUT} (${SIZE}x${SIZE}, logo ${LOGO}px) → ${APP_STORE_URL}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
