const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

const regex = /renderChatMessages\s*\} from '\.\/ui\.js';/;
if (app.match(regex)) {
  app = app.replace(regex, "renderChatMessages,\n  toggleSidebarChat\n} from './ui.js';");
  fs.writeFileSync('app.js', app);
  console.log("Fixed import");
} else {
  console.log("Regex not matched");
}
