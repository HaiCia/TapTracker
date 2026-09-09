const fs = require('fs');

const appUpdates = `

import { checkIn, checkOut, sendChatMessage, loadChatMessages, renderChatMessages } from './ui.js';

window.checkIn = checkIn;
window.checkOut = checkOut;
window.sendChatMessage = sendChatMessage;
window.loadChatMessages = loadChatMessages;

// Setup Realtime
function setupRealtime() {
  const channel = supabaseClient.channel('public_room');

  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, payload => {
    // Reload pubs to update checkin counts and markers
    loadPubs();
    // Update modal if open
    if (state.currentPubId) {
      const pubId = state.currentPubId;
      const statusEl = document.getElementById('checkin-status');
      if (statusEl) {
        statusEl.innerText = (state.myCheckin && state.myCheckin.pub_id === pubId)
          ? '✅ You are checked in here'
          : (state.checkins && state.checkins[pubId] ? \`👥 \${state.checkins[pubId]} people here\` : "No one is here right now");
      }
    }
  });

  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pub_messages' }, payload => {
    const newMsg = payload.new;
    const pubId = newMsg.pub_id;
    if (!state.pubMessages[pubId]) state.pubMessages[pubId] = [];
    state.pubMessages[pubId].push(newMsg);
    if (state.currentPubId === pubId) {
      renderChatMessages(pubId);
    }
  });

  channel.subscribe();
}

const originalStartApp = startApp;
startApp = async function() {
  await originalStartApp();
  
  // also get my current checkin
  const { data } = await supabaseClient.from('checkins').select('*').eq('user_id', state.currentUser.id).gt('expires_at', new Date().toISOString());
  if (data && data.length > 0) {
    state.myCheckin = data[0];
  }

  setupRealtime();
};
window.onload = startApp;
`;

let app = fs.readFileSync('app.js', 'utf8');

// replace the ui.js imports
app = app.replace('removeSingleVisit', 'removeSingleVisit,\n  checkIn,\n  checkOut,\n  sendChatMessage,\n  loadChatMessages,\n  renderChatMessages');

// remove window.onload = startApp;
app = app.replace('window.onload = startApp;', appUpdates);

fs.writeFileSync('app.js', app);
