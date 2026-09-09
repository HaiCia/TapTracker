const fs = require('fs');
let js = fs.readFileSync('do_ui.js', 'utf8');
const idx = js.indexOf('// 6. Community reviews button');
js = js.substring(0, idx);
fs.writeFileSync('do_ui.js', js);
