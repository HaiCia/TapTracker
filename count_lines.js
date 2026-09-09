const fs = require('fs');
const lines = fs.readFileSync('ui.js', 'utf8').split('\\n');
console.log('Total lines:', lines.length);
if (lines.length > 0) console.log('Last line:', lines[lines.length-1]);
