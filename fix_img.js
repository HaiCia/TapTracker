const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

ui = ui.replace(
  `onclick="event.stopPropagation(); window.openPubDetails('\${pubId}')" style="cursor:pointer; width: 75px; height: 75px; object-fit: cover;`,
  `onclick="event.stopPropagation(); window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}); window.openPubDetails('\${pubId}')" style="cursor:pointer; width: 75px; height: 75px; object-fit: cover;`
);

ui = ui.replace(
  `<div onclick="event.stopPropagation(); window.openPubDetails('\${pubId}')" style="cursor:pointer; width: 75px; height: 75px; background: var(--bg-app);`,
  `<div onclick="event.stopPropagation(); window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}); window.openPubDetails('\${pubId}')" style="cursor:pointer; width: 75px; height: 75px; background: var(--bg-app);`
);

fs.writeFileSync('ui.js', ui);
