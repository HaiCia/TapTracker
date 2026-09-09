const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// Replace corrupted ✖
ui = ui.replace(/>o-<\/button>/g, '>✖</button>');

// Replace corrupted ✔️
ui = ui.replace(/"\/ VISITED/g, '✔️ VISITED');
ui = ui.replace(/✔️ VISITED/g, '✔️ VISITED');

// Replace any other corrupted emojis if necessary.
// Actually, let's just use regular expressions to clean it up
ui = ui.replace(/>o-<\/button>/g, '>✖</button>');

// Wait, let's just rewrite historyHtml fully to be safe.
const oldHistoryRegex = /let historyHtml = pub\.visit_history && pub\.visit_history\.length > 0[\s\S]*?: `<li style="color: #999; font-style: italic;">No visits yet<\/li>`;/;

const newHistoryStr = `let historyHtml = pub.visit_history && pub.visit_history.length > 0
    ? pub.visit_history.map((d, index) => \`<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">\${escapeHTML(d)} \${state.currentUser ? \`<button onclick="window.removeSingleVisit('\${pubId}', \${index})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>\` : ""}</li>\`).join("")
    : isVisited && pub.visit_date
      ? \`<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">\${escapeHTML(pub.visit_date)} \${state.currentUser ? \`<button onclick="if(confirm('Delete visit?')) window.toggleVisitState('\${pubId}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>\` : ""}</li>\`
      : \`<li style="color: #999; font-style: italic;">No visits yet</li>\`;`;

ui = ui.replace(oldHistoryRegex, newHistoryStr);

fs.writeFileSync('ui.js', ui);
