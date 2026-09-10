const fs = require('fs');

let ui = fs.readFileSync('ui.js', 'utf8');

// The start of the block we want to replace inside the loop:
const startString = `      let addressHtml = marker.pubData.address`;
// The end of the block we want to replace:
const endString = `\${state.isListOnly ? \`<button onclick="event.stopPropagation(); window.toggleViewMode(); setTimeout(() => window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}), 100);" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: #2196f3; border: none; color: white; width: 100%; cursor: pointer; margin-top: 4px;">🗺️ SEE ON MAP</button>\` : ''}
            </div>
        </div>
      \`;`;

const startIndex = ui.indexOf(startString);
const endIndex = ui.indexOf(endString) + endString.length;

if (startIndex !== -1 && endIndex !== -1) {
    console.log("Found block to replace. Length:", endIndex - startIndex);
} else {
    console.log("Could not find block", startIndex, endIndex);
}
