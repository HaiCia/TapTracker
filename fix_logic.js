const fs = require('fs');

let ui = fs.readFileSync('ui.js', 'utf8');

// List button
const listBtnRegex = /<button class="pub-status-btn[\s\S]*?<\/button>/;
const listBtnReplacement = `<button class="pub-status-btn status-unvisited" onclick="event.stopPropagation(); window.handleAddVisit('\${pubId}')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 100%;">
                    \${isVisited ? "+ ADD ANOTHER VISIT" : "+ ADD VISIT"}
                </button>`;
ui = ui.replace(listBtnRegex, listBtnReplacement);

// Modal button logic
const modalBtnRegex = /<div style="display: flex; flex-direction: column; gap: 8px;">[\s\S]*?<\/div>/;
const modalBtnReplacement = `<div style="display: flex; flex-direction: column; gap: 8px;">
          \${!isVisited ? \`<button onclick="window.handleAddVisit('\${pubId}')" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; width: 100%;">+ ADD VISIT</button>\` : \`<button onclick="if(confirm('Delete ALL visits?')) { window.toggleVisitState('\${pubId}'); document.getElementById('pub-modal-overlay').remove(); }" style="background: var(--bg-primary); color: #e74c3c; border: 1px solid #e74c3c; padding: 10px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold; font-size: 13px;">❌ UNMARK (Delete Visits)</button>\`}
        </div>`;
ui = ui.replace(modalBtnRegex, modalBtnReplacement);

// Remove buttonAddText variable
ui = ui.replace(/const buttonAddText = [^;]+;/, '');

fs.writeFileSync('ui.js', ui);
