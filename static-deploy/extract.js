const fs = require('fs');
const html = fs.readFileSync('Volt-Double-Click.html', 'utf8');

// Extract CSS
const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
const css = styleMatch ? styleMatch[1] : '';

// Extract JS
const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
const js = scriptMatch ? scriptMatch[1] : '';

// Create index.html
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Volt — Local-First Development Operating Environment</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body class="theme-pure-black">
  <div id="volt-viewport"></div>
  <script src="app.js"></script>
</body>
</html>`;

// Write files
fs.writeFileSync('static-deploy/index.html', indexHtml);
fs.writeFileSync('static-deploy/styles.css', css);
fs.writeFileSync('static-deploy/app.js', js);

console.log('✅ Static deployment files created successfully!');
console.log('Files:');
console.log('  - static-deploy/index.html');
console.log('  - static-deploy/styles.css');
console.log('  - static-deploy/app.js');
