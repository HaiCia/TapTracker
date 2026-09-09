const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');
ui = ui.replace('state.currentPubId = pubId;', "const existingModal = document.getElementById('pub-modal-overlay');\\n  if (existingModal) existingModal.remove();\\n  state.currentPubId = pubId;");
fs.writeFileSync('ui.js', ui);
