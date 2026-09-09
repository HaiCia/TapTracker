const fs = require('fs');
let map = fs.readFileSync('map.js', 'utf8');

const oldLoadPubsStart = map.indexOf('const { data: pubs } = await supabaseClient.from("pubs").select("*");');
const newLoadPubsContent = `const { data: pubs } = await supabaseClient.from("pubs").select("*");
  const { data: activeCheckins } = await supabaseClient.from("checkins").select("*").gt("expires_at", new Date().toISOString());

  state.checkins = {};
  if (activeCheckins) {
    activeCheckins.forEach(c => {
      if (!state.checkins[c.pub_id]) state.checkins[c.pub_id] = 0;
      state.checkins[c.pub_id]++;
    });
  }`;

map = map.replace('const { data: pubs } = await supabaseClient.from("pubs").select("*");', newLoadPubsContent);

fs.writeFileSync('map.js', map);
