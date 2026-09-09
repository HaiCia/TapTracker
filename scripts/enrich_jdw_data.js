const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function fetchAllJdwPubs() {
  let allPubs = [];
  for (let page = 1; page <= 9; page++) {
    const res = await fetch(`https://www.jdwetherspoon.com/wp-json/wp/v2/pubs?per_page=100&page=${page}`);
    if (!res.ok) break;
    const data = await res.json();
    if (data.length === 0) break;
    allPubs = allPubs.concat(data);
  }
  return allPubs;
}

async function enrich() {
  console.log("Pobieram bazę pubów z Supabase...");
  const { data: supaPubs, error } = await supabase.from("pubs").select("*").limit(3000);
  if (error) throw error;

  console.log("Pobieram oficjalną bazę z jdwetherspoon.com...");
  const jdwPubs = await fetchAllJdwPubs();
  console.log(`Pobrano ${jdwPubs.length} pubów ze strony JDW.`);

  let updatedCount = 0;

  for (const dbPub of supaPubs) {
    let bestMatch = null;
    let minDistance = 0.5; // max 500m

    for (const jdw of jdwPubs) {
      if (!jdw.acf || !jdw.acf.latitude || !jdw.acf.longitude) continue;
      const d = getDistance(dbPub.lat, dbPub.lng, parseFloat(jdw.acf.latitude), parseFloat(jdw.acf.longitude));
      if (d < minDistance) {
        minDistance = d;
        bestMatch = jdw;
      }
    }

    if (bestMatch) {
      const address = bestMatch.acf.full_address || [bestMatch.acf.address_line_1, bestMatch.acf.address_line_2, bestMatch.acf.towncity, bestMatch.acf.postcode].filter(Boolean).join(", ");
      let image_url = "https://www.jdwetherspoon.com/~/media/Images/Jdw/icons/jdw-logo-red.png";
      
      if (bestMatch.yoast_head_json && bestMatch.yoast_head_json.og_image && bestMatch.yoast_head_json.og_image.length > 0) {
        image_url = bestMatch.yoast_head_json.og_image[0].url;
      } else if (bestMatch.yoast_head_json && bestMatch.yoast_head_json.schema && bestMatch.yoast_head_json.schema["@graph"]) {
        const primaryImage = bestMatch.yoast_head_json.schema["@graph"].find(g => g["@type"] === "ImageObject" && g.url && !g.url.includes("logomark"));
        if (primaryImage) image_url = primaryImage.url;
      }

      const { error: upErr } = await supabase.from("pubs").update({ address, image_url }).eq("id", dbPub.id);
      if (!upErr) {
        updatedCount++;
        if (updatedCount % 50 === 0) console.log(`Zaktualizowano ${updatedCount} pubów...`);
      }
    }
  }

  console.log(`✅ Gotowe! Pomyślnie zaktualizowano adresy i zdjęcia dla ${updatedCount} pubów.`);
}

enrich();
