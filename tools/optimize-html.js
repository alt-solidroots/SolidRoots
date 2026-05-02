const fs = require('fs');

const files = ['public/index.html', 'public/about.html', 'public/select-your-path.html'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');

  // Hero image should be eager loaded with high priority
  html = html.replace(/<img\s+alt="Luxury Real Estate"/, '<img fetchpriority="high" loading="eager" decoding="async" alt="Luxury Real Estate"');

  // All other images should be lazy loaded
  html = html.replace(/<img\s+(?!fetchpriority)/g, '<img loading="lazy" decoding="async" ');

  fs.writeFileSync(file, html);
  console.log(`Optimized images in ${file}`);
}
