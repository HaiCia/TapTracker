const fs = require('fs');

let map = fs.readFileSync('map.js', 'utf8');
map = map.replace('dropdown.classList.add("hidden");', 'dropdown.classList.remove("show");');
map = map.replace('!dropdown.classList.contains("hidden")', 'dropdown.classList.contains("show")');
fs.writeFileSync('map.js', map);

let app = fs.readFileSync('app.js', 'utf8');
app = app.replace('dropdown.classList.add("hidden");', 'dropdown.classList.remove("show");');
app = app.replace('!dropdown.classList.contains("hidden")', 'dropdown.classList.contains("show")');
fs.writeFileSync('app.js', app);
