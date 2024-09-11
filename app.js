import { config } from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import { bruteForceSimple } from "./serverScripts/bruteSimple.js";
import { bruteForceLibrary } from "./serverScripts/bruteLibrary.js";
import { passwordDecoder } from "./serverScripts/encoder.js";
import { updatePasswordList } from "./serverScripts/updateDropBox.js";
import { loadPasswordList } from "./serverScripts/loadPasswordList.js";
import { authenticateToken } from "./serverScripts/authentification.js";
import OpenAI from "openai";
import cron from "node-cron";

const openAiKey = process.env.OPENAI_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const port = process.env.PORT || 3000; // Set the port from the environment variable or default to 3000
const JWT_SECRET = process.env.JWT_SECRET;

config();
const app = express();

app.use(cors());
app.use(express.json());

let passwordList;

app.get("/", (req, res) => {
  res.send("hello world");
});

// =================================================================

//        REGISTER / LOGIN / STUFF

// ===================================================

app.post("/register", async (req, res) => {
  const {
    username,
    password,
    email,
    visits,
    generatedPasswords,
    testedPasswords,
    generatedUsernames,
  } = req.body;
  const saltRounds = 10;

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const { data, error } = await supabase
      .from("passwordplayground")
      .insert([
        {
          username,
          password_hash: hashedPassword,
          email,
          visits,
          generatedPasswords,
          testedPasswords,
          generatedUsernames,
        },
      ]);

    if (error) {
      console.log("Error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Registrierung fehlgeschlagen" });
    }

    res
      .status(200)
      .json({ success: true, message: "Registrierung erfolgreich" });
  } catch (error) {
    console.log("Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Fehler bei der Registrierung" });
  }
});
app.post("/logIn", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Hole den Benutzer aus der Datenbank
    const { data, error } = await supabase
      .from("passwordplayground")
      .select("password_hash,id,avatar")
      .eq("username", username)
      .single();

    if (error) {
      console.error("Fehler bei der Abfrage:", error);
      return res
        .status(500)
        .json({ success: false, message: "Benutzer nicht gefunden" });
    }

    if (!data) {
      console.log("Benutzer nicht gefunden");
      return res
        .status(401)
        .json({ success: false, message: "Ungültige Anmeldedaten" });
    }

    // Passwortvergleich
    const match = await bcrypt.compare(password, data.password_hash);

    if (match) {
      console.log("Login erfolgreich");
      const token = jwt.sign({ username, id: data.id }, JWT_SECRET, {
        expiresIn: "1h",
      });
      res
        .status(200)
        .json({
          success: true,
          message: "Login erfolgreich",
          token,
          avatar: data.avatar,
          id: data.id,
        });
    } else {
      console.log("Ungültige Anmeldedaten");
      res
        .status(401)
        .json({ success: false, message: "Ungültige Anmeldedaten" });
    }
  } catch (error) {
    console.error("Fehler beim Login:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Fehler beim Login. Bitte versuche es später noch einmal.",
      });
  }
});

app.delete("/deleteUser", authenticateToken, async (req, res) => {
  try {
    // Benutzer-ID aus dem Token extrahieren
    const username = req.user.username; // Annahme: `req.user` enthält die Benutzer-ID

    // Benutzer aus der Datenbank löschen
    const { error } = await supabase
      .from("passwordplayground")
      .delete()
      .eq("username", username);

    if (error) {
      throw new Error("Fehler beim Löschen des Benutzers: " + error.message);
    }

    res
      .status(200)
      .json({ success: true, message: "Benutzer erfolgreich gelöscht" });
  } catch (error) {
    console.log("tzest");
    console.error("Fehler beim Löschen des Benutzers:", error);
    res
      .status(500)
      .json({
        success: false,
        message:
          "Fehler beim Löschengsdgsdgsdg des Benutzers. Bitte versuche es später noch einmal.",
      });
  }
});

app.get("/user", authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from("passwordplayground")
    .select("avatar")
    .eq("id", req.user.id);

  console.log(data);

  res
    .status(200)
    .json({
      username: req.user.username,
      id: req.user.id,
      avatar: data[0].avatar,
    });
});

// ================================================================

//         DATAKRAKEN

// ===============================================================

app.post("/dataKrakenTakes", async (req, res) => {
  if (!req.body.token) {
    return res
      .status(401)
      .json({ success: false, message: "Kein Token vorhanden" });
  }
  const token = jwt.decode(req.body.token);
  const id = token.id; // ID aus dem Token
  const col = req.body.col; // Name der Spalte, die erhöht werden soll

  try {
    // Hole den aktuellen Wert der Spalte
    const { data: currentData, error: fetchError } = await supabase
      .from("passwordplayground")
      .select(col)
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Fehler beim Abrufen der aktuellen Daten:", fetchError);
      return res
        .status(500)
        .json({ success: false, message: "Fehler beim Abrufen der Daten" });
    }

    if (!currentData) {
      console.log("Datensatz nicht gefunden");
      return res
        .status(404)
        .json({ success: false, message: "Datensatz nicht gefunden" });
    }

    // Erhöhe den Wert der Spalte um 1
    const newValue = (currentData[col] || 0) + 1;

    // Aktualisiere die Zeile
    const { data: updatedData, error: updateError } = await supabase
      .from("passwordplayground")
      .update({ [col]: newValue })
      .eq("id", id)
      .select(); // Verwende .select(), um die aktualisierten Daten abzurufen

    if (updateError) {
      console.error("Fehler beim Erhöhen des Wertes:", updateError);
      return res
        .status(500)
        .json({ success: false, message: "Fehler beim Erhöhen des Wertes" });
    }

    res.status(200).json({ success: true, message: "Wert erfolgreich erhöht" });
  } catch (error) {
    console.error("Fehler bei der Anfrage:", error);
    res.status(500).json({ success: false, message: "Fehler bei der Anfrage" });
  }
});

app.get("/dataKrakenGives", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("passwordplayground")
      .select(
        "username,email,visits,generatedPasswords,testedPasswords,generatedUsernames,avatar"
      )
      .eq("id", req.user.id);

    if (data) {
      res
        .status(200)
        .json({ success: true, message: "Daten erfolgreich geladen", data });
    } else {
      console.log(error);
    }
  } catch (error) {
    console.error("Fehler bei der Anfrage:", error);
    res.status(500).json({ success: false, message: "Fehler bei der Anfrage" });
  }
});

app.put("/dataKrakenTrades", authenticateToken, async (req, res) => {
  let key = req.body.key;
  let value = req.body.value;
  const id = req.user.id;
  if (key === "password") {
    const saltRounds = 10;
    value = await bcrypt.hash(value, saltRounds);
    key = "password_hash";
  }

  console.log(key, value);

  try {
    const { data, error } = await supabase
      .from("passwordplayground")
      .update({ [key]: value })
      .eq("id", id);
    console.log(value, id, key);
    res
      .status(200)
      .json({ success: true, message: "Benuzterdaten erfolgreich geändert" });
  } catch (error) {
    console.error("Fehler bei der Anfrage:", error);
    res.status(500).json({ success: false, message: "Fehler bei der Anfrage" });
  }
});

// ============================================

//     API CALL AI/ML

// =================================================

app.get("/apiCall", async (req, res) => {
  const openai = new OpenAI({
    apiKey: openAiKey,
    baseURL: "https://api.aimlapi.com",
  });

  const key = req.query.key;
  const pwd = req.query.pwd || "abc";
  const sysContent = req.query.sysContent;
  const decodedPwd = passwordDecoder(pwd, key);

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "meta-llama/Meta-Llama-3-70B-Instruct-Lite",
      messages: [
        { role: "system", content: sysContent },
        { role: "user", content: decodedPwd },
      ],
      temperature: 0.7,
      max_tokens: 128,
    });

    const result = chatCompletion.choices[0].message.content;
    res.send(result);
  } catch (error) {
    console.log(error);
    res.send("no");
  }
});

app.get("/apiCallUsername", async (req, res) => {
  const openai = new OpenAI({
    apiKey: openAiKey,
    baseURL: "https://api.aimlapi.com",
  });

  const adj1 = req.query.adj1;
  const adj2 = req.query.adj2;
  const noun = req.query.noun;
  const sysContent = req.query.sysContent;
  const apiString = adj1 + " " + adj2 + " " + noun;

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "meta-llama/Meta-Llama-3-70B-Instruct-Lite",
      messages: [
        { role: "system", content: sysContent },
        { role: "user", content: apiString },
      ],
      temperature: 0.5,
      max_tokens: 50,
    });

    const result = chatCompletion.choices[0].message.content;
    res.send(result);
  } catch (error) {
    console.error("Error in API call or processing:", error);

    res.status(500).json({
      success: false,
    });
  }
});

// ================================================

//         BRUTE FORCE

// ==============================================

const currentProcess = {};

app.get("/bruteForceSimple", async (req, res) => {
  const key = req.query.key;
  const password = req.query.pwd || "abc";
  const decodedPwd = passwordDecoder(password, key);
  if (currentProcess[password]) {
    return res.status(400).send("Ein Prozess läuft bereits.");
  }

  currentProcess[password] = bruteForceSimple(decodedPwd);

  currentProcess[password].promise
    .then((result) => {
      res.send(result);
      currentProcess[password] = null;
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("error occured during brute force process");
      currentProcess[password] = null;
    });
});

app.get("/bruteForceLibrary", async (req, res) => {
  const key = req.query.key;
  const password = req.query.pwd;
  const decodedPwd = passwordDecoder(password, key);
  console.log("PWD:", password, "decoded:", decodedPwd);
  try {
    const result = await bruteForceLibrary(decodedPwd, passwordList);
    console.log(result);
    res.send(result);
    console.log(result);
  } catch (error) {
    if (!passwordList) console.error("data not loaded");
    console.error("Ah shit, here we go again");
    res.status(500).send("error");
  }
});

app.get("/stopBruteForce", (req, res) => {
  const key = req.query.key;

  console.log(key);
  if (currentProcess[key]) {
    currentProcess[key].abort();
    currentProcess[key] = null;
    res.send("process stopped");
    console.log("brute force stopped");
  } else {
    res.status(400).send("no process running");
  }
});

// ====================================

//          PASSWORD LIST & Update + Cron Job

// ====================================

(async function loadPasswords() {
  try {
    passwordList = await loadPasswordList();
  } catch (error) {
    console.log("Error loading passwords:", error);
  }
})();

cron.schedule("0 0 * * *", () => {
  console.log("Cron Job wird ausgeführt: updatePasswordList");
  updatePasswordList(passwordList);
});

// =======================================

//  Health Check & server start

// ====================================

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Start the server and log the URL to the console
app.listen(port, () => {
  console.log(`Server running at ${port}/`);
});
