import { supabaseClient } from './api.js';
import { state } from './state.js';
import {
  setupUserProfile,
  generateNewFriendCode,
  copyFriendCode,
  changeNickname,
  rotateFriendCode,
  changePassword,
  logout,
  grantAdminStatus,
  revokeAdminStatus
} from './auth.js';
import { initMap, loadPubs, applyFilters, flyToPub } from './map.js';
import {
  getMarkerHtml,
  getStarsHtml,
  highlightSidebar,
  updateSidebarList,
  setFilter,
  handleSearch,
  toggleVisitState,
  compareMap,
  stopComparing,
  toggleSidebar,
  toggleViewMode,
  saveRating,
  markAsVisited,
  removeVisit,
  toggleFavorite,
  openPubDetails,
  savePubTexts,
  handleAddVisit
} from './ui.js';

async function startApp() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  
  state.currentUser = session.user;

  setupUserProfile();
  initMap();
}

function toggleUserMenu() {
  const dropdown = document.getElementById("user-dropdown");
  if (dropdown) dropdown.classList.toggle("show");
}

// Bind functions to window so inline HTML onclick attributes can access them
window.toggleUserMenu = toggleUserMenu;
window.copyFriendCode = copyFriendCode;
window.changeNickname = changeNickname;
window.rotateFriendCode = rotateFriendCode;
window.changePassword = changePassword;
window.logout = logout;
window.grantAdminStatus = grantAdminStatus;
window.revokeAdminStatus = revokeAdminStatus;

window.compareMap = compareMap;
window.stopComparing = stopComparing;

window.toggleSidebar = toggleSidebar;
window.toggleViewMode = toggleViewMode;
window.setFilter = setFilter;
window.handleSearch = handleSearch;

window.flyToPub = flyToPub;
window.highlightSidebar = highlightSidebar;
window.toggleVisitState = toggleVisitState;
window.saveRating = saveRating;
window.markAsVisited = markAsVisited;
window.removeVisit = removeVisit;
window.toggleFavorite = toggleFavorite;
window.openPubDetails = openPubDetails;
window.savePubTexts = savePubTexts;
window.handleAddVisit = handleAddVisit;
window.editNote = function(pubId) {
    alert("Edit note function is not implemented yet. Use 'note' in pub details.");
};

window.onload = startApp;
