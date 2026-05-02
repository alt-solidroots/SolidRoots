const fs = require('fs');

const files = ['public/index.html', 'public/about.html', 'public/select-your-path.html', 'public/admin.html'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');

  // Replace multiple Google Font links with a single combined link
  html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Manrope[^"]+" rel="stylesheet"\/>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined[^"]+" rel="stylesheet"\/>/g, 
    '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Work+Sans:wght@300..600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>');

  // For select-your-path which might have slightly different wghts
  html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Manrope[^"]+" rel="stylesheet"\/>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Material\+Symbols\+Outlined[^"]+" rel="stylesheet"\/>/g, 
    '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Work+Sans:wght@300;400;500;600;900&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>');

  fs.writeFileSync(file, html);
  console.log(`Combined fonts in ${file}`);
}
