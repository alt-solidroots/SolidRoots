const fs = require('fs');
const path = require('path');

const htmlFiles = ['public/index.html', 'public/about.html', 'public/select-your-path.html', 'public/admin.html'];
const cssFile = 'public/styles.css';

// Read CSS content for inlining
const cssContent = fs.readFileSync(cssFile, 'utf8');

const icons = ['account_balance_wallet','verified','ads_click','star','share','camera','handshake','visibility','language','public','landscape','admin_panel_settings','dashboard','logout','login','error','check_circle','info','warning','close','menu','arrow_back','arrow_forward','home','search'];
const uniqueChars = Array.from(new Set(icons.join('') + '0123456789')).sort().join('');

for (const file of htmlFiles) {
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');

  // 1. Inline CSS
  // Replace the stylesheet link with an inline style tag
  html = html.replace(/<link href="styles\.css" rel="stylesheet"\/>/g, `<style>${cssContent}</style>`);

  // 2. Optimize Unsplash Images even more (q=45, smaller widths)
  html = html.replace(/images\.unsplash\.com\/([^"?]+)\?[^"]+/g, (match, photoId) => {
    let width = 800;
    if (match.includes('w=1600')) width = 1200; // Reduce hero from 1600 to 1200
    if (match.includes('w=800')) width = 600;   // Reduce standard from 800 to 600
    return `images.unsplash.com/${photoId}?auto=format,compress&fit=crop&w=${width}&q=45&fm=webp`;
  });

  // 3. Optimize Google Fonts with &text parameter for icons
  html = html.replace(/family=Material\+Symbols\+Outlined:wght,FILL@100\.\.700,0\.\.1/g, 
    `family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&text=${encodeURIComponent(uniqueChars)}`);

  // 4. Asynchronous CSS for fonts (only if not already combined and preloaded)
  // Actually, we'll keep the single link but add media="print" onload trick
  html = html.replace(/<link href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)" rel="stylesheet"\/>/g, 
    '<link rel="preload" as="style" href="$1"/><link href="$1" rel="stylesheet" media="print" onload="this.media=\'all\'"/><noscript><link href="$1" rel="stylesheet"/></noscript>');

  fs.writeFileSync(file, html);
  console.log(`Deeply optimized ${file}`);
}
