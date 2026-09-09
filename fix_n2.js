const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

const badSubstring = "const existingModal = document.getElementById('pub-modal-overlay');\\n  if (existingModal) existingModal.remove();\\n  state.currentPubId = pubId;";
const goodSubstring = "const existingModal = document.getElementById('pub-modal-overlay');\\n  if (existingModal) existingModal.remove();\\n  state.currentPubId = pubId;".replace(/\\\\n/g, '\\n');

if (ui.includes(badSubstring)) {
  ui = ui.replace(badSubstring, goodSubstring);
  fs.writeFileSync('ui.js', ui);
  console.log("Fixed literal \\n");
} else {
  console.log("Substring not found!");
}
