const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

ui = ui.replace(
  "renderChatMessages(pubId);\n  }",
  "renderChatMessages(pubId);\n    updateSidebarList();\n  }"
);

fs.writeFileSync('ui.js', ui);
console.log('Fixed ui.js loadChatMessages');
