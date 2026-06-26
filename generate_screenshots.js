import sharp from 'sharp';

async function generate() {
  // Create a 1080x1920 (mobile portrait) screenshot
  await sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: { r: 139, g: 92, b: 246, alpha: 1 } // purple-500
    }
  })
  .composite([
    {
      input: Buffer.from('<svg width="800" height="200"><text x="50%" y="50%" font-family="sans-serif" font-size="100" text-anchor="middle" fill="white">TeachDZ Mobile</text></svg>'),
      gravity: 'center'
    }
  ])
  .png()
  .toFile('public/screenshot-mobile.png');

  // Create a 1920x1080 (desktop landscape) screenshot
  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 4,
      background: { r: 139, g: 92, b: 246, alpha: 1 }
    }
  })
  .composite([
    {
      input: Buffer.from('<svg width="1000" height="200"><text x="50%" y="50%" font-family="sans-serif" font-size="100" text-anchor="middle" fill="white">TeachDZ Desktop</text></svg>'),
      gravity: 'center'
    }
  ])
  .png()
  .toFile('public/screenshot-desktop.png');

  console.log('Screenshots generated!');
}

generate().catch(console.error);
