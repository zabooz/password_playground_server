

import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const  leaderBoard = async (username) => {

let finalResult;
try {
  // Abrufen der Top 10 Einträge sortiert nach 'visits'
  const { data: topTen, error: topTenError } = await supabase
    .from("passwordplayground")
    .select("username,visits,generated_passwords,tested_passwords,generated_usernames")
    .order("visits", { ascending: false })
    .limit(10);

  if (topTenError) {
    throw topTenError;
  }

  // Überprüfen, ob der Benutzer mit ID 31 in den Top 10 ist
  const userInTopTen = topTen.some((entry) => entry.username === username);

  finalResult = [...topTen];
  // Falls der Benutzer mit ID 31 nicht in den Top 10 ist, diesen separat abrufen
  if (!userInTopTen) {
    const { data: user, error: userError } = await supabase
      .from("passwordplayground")
      .select("username,visits,generated_passwords,tested_passwords,generated_usernames")
      .eq("username", username)
      .single(); // Nur ein Datensatz für ID 31

    if (userError) {
      throw userError;
    }

    // Füge den Benutzer zu den Ergebnissen hinzu
    finalResult = [...topTen, user];
    
}
return finalResult;

} catch (error) {
  console.log("Fehler:", error);
}

}

