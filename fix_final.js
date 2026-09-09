const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// 1. Fix red X
ui = ui.replace('❌ TO VISIT', '➕ TO VISIT');

// 2. Fix image onclick
ui = ui.replace(
  /let imgHtml = marker\.pubData\.image_url\s*\?\s*`<img src="\${escapeHTML\(marker\.pubData\.image_url\)}" loading="lazy" style="width: 75px; height: 75px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 2px 5px rgba\(0,0,0,0\.1\);">`\s*:\s*`<div style="width: 75px; height: 75px; background: #f0f2f5; border-radius: 8px; flex-shrink: 0; display:flex; align-items:center; justify-content:center; color:#ccc; font-size: 24px;"><i class="fa-solid fa-beer-mug-empty"><\/i><\/div>`;/,
  `let imgHtml = marker.pubData.image_url
        ? \`<img onclick="event.stopPropagation(); window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}); window.openPubDetails('\${pubId}')" src="\${escapeHTML(marker.pubData.image_url)}" loading="lazy" style="cursor:pointer; width: 75px; height: 75px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">\`
        : \`<div onclick="event.stopPropagation(); window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}); window.openPubDetails('\${pubId}')" style="cursor:pointer; width: 75px; height: 75px; background: var(--bg-app); border-radius: 8px; flex-shrink: 0; display:flex; align-items:center; justify-content:center; color:#ccc; font-size: 24px;"><i class="fa-solid fa-beer-mug-empty"></i></div>\`;`
);

// 3. Fix modal background and text colors
ui = ui.replace(/<div style="background: white;/g, '<div style="background: var(--bg-primary); color: var(--text-primary);');
ui = ui.replace(/background: #eee; border-radius: 50%;/g, 'background: var(--bg-app); color: var(--text-primary); border-radius: 50%;');
ui = ui.replace(/background: #f8f9fa;/g, 'background: var(--bg-app);');
ui = ui.replace(/color: #555;/g, 'color: var(--text-secondary);');
ui = ui.replace(/color: #333;/g, 'color: var(--text-secondary);');
ui = ui.replace(/border-top: 1px solid #ddd;/g, 'border-top: 1px solid var(--border-color);');
ui = ui.replace(/border: 1px solid #ccc;/g, 'border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);');
ui = ui.replace(/color: #666;/g, 'color: var(--text-secondary);');
ui = ui.replace(/border: 1px solid #ddd;/g, 'border: 1px solid var(--border-color);');
ui = ui.replace(/color: #444;/g, 'color: var(--text-primary);');

// 4. In modal, the address text color is `#777`, let's make it `var(--text-secondary)`
ui = ui.replace(/color: #777;/g, 'color: var(--text-secondary);');

fs.writeFileSync('ui.js', ui);
