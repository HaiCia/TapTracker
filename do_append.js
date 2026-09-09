const fs = require('fs');

const func = `
export async function removeSingleVisit(pubId, index) {
  const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  let history = marker.pubData.visit_history || [];
  if (history.length <= 1) {
    if (confirm("This is your last visit. Delete it completely?")) {
      await toggleVisitState(pubId);
      const modal = document.getElementById('pub-modal-overlay');
      if (modal) modal.remove();
    }
    return;
  }

  history.splice(index, 1);
  const { error } = await supabaseClient.from("visits").update({
    visit_history: history,
    visit_date: history[history.length - 1]
  }).eq("user_id", state.currentUser.id).eq("pub_id", pubId);

  if (!error) {
    marker.pubData.visit_history = history;
    marker.pubData.visit_date = history[history.length - 1];
    const modal = document.getElementById('pub-modal-overlay');
    if (modal) modal.remove();
    openPubDetails(pubId);
    updateSidebarList();
  }
}
`;

fs.appendFileSync('ui.js', '\n' + func);
