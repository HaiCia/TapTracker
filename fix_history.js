const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

const historyRegex = /let historyHtml = pub\.visit_history && pub\.visit_history\.length > 0[\s\S]*?pub\.visit_history\.map\(\(d\) => `<li style="margin-bottom:4px;">\${escapeHTML\(d\)}<\/li>`\)\.join\(""\)[\s\S]*?: isVisited && pub\.visit_date[\s\S]*?\? `<li>\${escapeHTML\(pub\.visit_date\)}<\/li>`[\s\S]*?: `<li style="color: #999; font-style: italic;">No visits yet<\/li>`;/;

const historyReplacement = `let historyHtml = pub.visit_history && pub.visit_history.length > 0
    ? pub.visit_history.map((d, index) => \`<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">\${escapeHTML(d)} \${state.currentUser ? \`<button onclick="window.removeSingleVisit('\${pubId}', \${index})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>\` : ""}</li>\`).join("")
    : isVisited && pub.visit_date
      ? \`<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">\${escapeHTML(pub.visit_date)} \${state.currentUser ? \`<button onclick="if(confirm('Delete visit?')) window.toggleVisitState('\${pubId}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>\` : ""}</li>\`
      : \`<li style="color: #999; font-style: italic;">No visits yet</li>\`;`;

ui = ui.replace(historyRegex, historyReplacement);
fs.writeFileSync('ui.js', ui);
