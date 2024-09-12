

import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const  leaderBoard = async (username,col) => {

let finalResult;
try {
  // Abrufen der Top 10 Einträge sortiert nach 'visits'
  const { data: topTen, error: topTenError } = await supabase
    .from("passwordplayground")
    .select(
      "username,visits,tested_passwords,generated_passwords,generated_usernames"
    )
    .order(col, { ascending: false })
    .limit(10);

  if (topTenError) {
    throw topTenError;
  }

  // Überprüfen, ob der Benutzer mit ID 31 in den Top 10 ist
  const userInTopTen = topTen.some((entry) => entry.username === username);

  finalResult = [...topTen];
  // Falls der Benutzer mit ID 31 nicht in den Top 10 ist, diesen separat abrufen
  if (!userInTopTen) {
    const { data: users, error: usersError } = await supabase
      .from("passwordplayground")
      .select(
        "username, visits,tested_passwords, generated_passwords,  generated_usernames"
      )
      .order(col, { ascending: false });

  if (usersError) {
    console.error("Error fetching users:", usersError);
    return;
  }

  // Suchen der Position des Benutzers in der sortierten Liste
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex !== -1) {
    const user = users[userIndex];
    const rank = userIndex + 1; // Um die Position 1-basiert zu machen

    // Rückgabe der gesamten Zeile und der Rangposition
    finalResult = [...topTen, {rank,user}];
  } else {
    console.log("User not found");
    return null;
  }
    // Füge den Benutzer zu den Ergebnissen hinzu
    
}
return finalResult;

} catch (error) {
  console.log("Fehler:", error);
}

}

