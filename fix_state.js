const fs = require('fs');
let js = `export const state = {
  map: null,
  markers: [],
  checkins: {},
  pubMessages: {},
  markerCluster: null,
  currentUser: null,
  currentFilterType: 'all',
  currentSearchQuery: '',
  isSidebarHidden: window.innerWidth <= 768,
  isListOnly: false,
  friendVisitData: {},
  isComparing: false,
  isAdmin: false,
  isSuperadmin: false,
  lastNicknameChange: null,
  lastFriendCodeChange: null,
  userLocationMarker: null
};`;
fs.writeFileSync('state.js', js);
