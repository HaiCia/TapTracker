const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

const regex = /\$\{state\.checkins && state\.checkins\[pubId\] > 0 \? `<div style="margin-top:4px; font-size:10px; font-weight:bold; background:#2196f3; color:white; padding:4px 6px; border-radius:12px; text-align:center;">👥 \$\{state\.checkins\[pubId\]\} checked in<\/div>` : ""\}/;

const replaceStr = `\${state.checkins && state.checkins[pubId] > 0 ? \`<div style="margin-top:4px; font-size:10px; font-weight:bold; background:#2196f3; color:white; padding:4px 6px; border-radius:12px; text-align:center;">👥 \${state.checkins[pubId]} checked in</div>\` : ""}
                \${state.pubMessages && state.pubMessages[pubId] && state.pubMessages[pubId].length > 0 ? \`<div style="margin-top:4px; font-size:10px; font-weight:bold; background:#e74c3c; color:white; padding:4px 6px; border-radius:12px; text-align:center;">💬 \${state.pubMessages[pubId].length} msgs</div>\` : ""}`;

if (ui.match(regex)) {
  ui = ui.replace(regex, replaceStr);
  fs.writeFileSync('ui.js', ui);
  console.log('Added chat count to sidebar');
} else {
  console.log('Could not find sidebar checkins badge');
}
