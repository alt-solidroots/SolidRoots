const fs = require('fs');

const files = ['public/index.html', 'public/about.html', 'public/select-your-path.html'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');

  // Change all Unsplash image quality from 80 to 60 and add webp/avif format explicitly
  // Also reduce the default width for non-hero images (from 1200 down to 800)
  html = html.replace(/images\.unsplash\.com\/([^"?]+)\?[^"]+/g, (match, photoId) => {
    // If it's the hero image (w=1600), keep it 1600 but lower quality
    if (match.includes('w=1600')) {
        return `images.unsplash.com/${photoId}?auto=format,compress&fit=crop&w=1600&q=60&fm=webp`;
    }
    // For smaller images (w=1200), reduce to w=800 and lower quality
    return `images.unsplash.com/${photoId}?auto=format,compress&fit=crop&w=800&q=60&fm=webp`;
  });

  fs.writeFileSync(file, html);
  console.log(`Optimized images in ${file}`);
}
