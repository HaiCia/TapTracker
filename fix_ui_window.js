const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

ui = ui.replace(/window\.updateSidebarList\(\);/g, "updateSidebarList();");
ui = ui.replace(/window\.openPubDetails\(pubId\);/g, "openPubDetails(pubId);");

fs.writeFileSync('ui.js', ui);
console.log('Fixed ui.js window references');
