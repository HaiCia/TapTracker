const fs = require('fs');
const ui = fs.readFileSync('ui.js', 'utf8');
const match = ui.match(/<button class="pub-status-btn[\s\S]*?<\/button>/);
console.log("List button:", match ? match[0] : "Not found");

const modalMatch = ui.match(/<div style="display: flex; flex-direction: column; gap: 8px;">[\s\S]*?<\/div>/);
console.log("Modal buttons:", modalMatch ? modalMatch[0] : "Not found");
