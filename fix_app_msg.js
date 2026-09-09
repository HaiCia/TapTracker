const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

app = app.replace(
  "renderChatMessages(pubId);\n    }", 
  "renderChatMessages(pubId);\n    }\n    window.updateSidebarList();"
);

fs.writeFileSync('app.js', app);
console.log('Fixed app.js message listener');
