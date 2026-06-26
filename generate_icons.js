import sharp from 'sharp';
import fs from 'fs';

async function generate() {
  const input = 'public/prof_dali_logo.png';
  
  // Generate PWA icons
  await sharp(input).resize(192, 192).toFormat('png').toFile('public/icon-192x192.png');
  await sharp(input).resize(512, 512).toFormat('png').toFile('public/icon-512x512.png');
  await sharp(input).resize(1024, 1024).toFormat('png').toFile('public/icon-1024x1024.png');

  // For maskable, we can use the same or add some padding if needed, but let's just use the same
  await sharp(input).resize(192, 192).toFormat('png').toFile('public/maskable-192x192.png');
  await sharp(input).resize(512, 512).toFormat('png').toFile('public/maskable-512x512.png');

  console.log('Icons generated!');
}

generate().catch(console.error);
