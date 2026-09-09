const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');
app = app.replace("import { checkIn, checkOut, sendChatMessage, loadChatMessages, renderChatMessages } from './ui.js';", "");
fs.writeFileSync('app.js', app);
