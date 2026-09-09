const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

if (!app.includes('window.updateSidebarList = updateSidebarList;')) {
  app = app.replace('window.toggleSidebarChat = toggleSidebarChat;', 'window.toggleSidebarChat = toggleSidebarChat;\nwindow.updateSidebarList = updateSidebarList;');
  fs.writeFileSync('app.js', app);
  console.log('Added window.updateSidebarList to app.js');
}
