const fs = require('fs');
const lines = fs.readFileSync('ui.js', 'utf8').split('\\n');
for (let i = 430; i <= 445; i++) {
  console.log((i+1) + ': ' + lines[i]);
}
