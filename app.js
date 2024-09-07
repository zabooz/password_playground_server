import { config } from "dotenv";
import express from "express";

import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { bruteForceSimple } from "./serverScripts/bruteSimple.js";
import { bruteForceLibrary } from "./serverScripts/bruteLibrary.js";
import { passwordDecoder } from "./serverScripts/encoder.js";
import { updatePasswordList } from "./serverScripts/updateDropBox.js";
import { loadPasswordList } from "./serverScripts/loadPasswordList.js";
import OpenAI from "openai";
import cron from "node-cron";

const openAiKey = process.env.OPENAI_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const port = process.env.PORT || 3000; // Set the port from the environment variable or default to 3000

config();
const app = express(); // Create an Express application

app.use(cors());
app.use(express.json());

let passwordList;

(async function loadPasswords() {
  try {
    passwordList = await loadPasswordList();
  } catch (error) {
    console.log("Error loading passwords:", error);
  }
})();

app.get("/", (req, res) => {
  res.send("hello world");
});

app.post("/submitData", async (req, res) => {
  console.log("Received request body:", req.body);

  const { password } = req.body;

  // Überprüfen, ob das Passwort bereits in der Datenbank vorhanden ist
  const { data: existingPasswords, error: fetchError } = await supabase
    .from("passwordplayground")
    .select("*")
    .eq("password", password);

  if (fetchError) {
    console.error("Fehler beim Überprüfen des Passworts:", fetchError);
    return res.status(500).send("Fehler beim Überprüfen des Passworts");
  }

  // Prüfen, ob das Passwort bereits vorhanden ist
  if (existingPasswords.length > 0) {
    console.log("Passwort bereits vorhanden:", password);
    return res.status(400).send("Passwort bereits vorhanden");
  }

  // Daten in die Tabelle 'passwordplayground' einfügen
  const { data: insertedData, error: insertError } = await supabase
    .from("passwordplayground")
    .insert([{ password }])
    .select("password");

  if (insertError) {
    console.error("Fehler beim Einfügen der Daten:", insertError);
    return res.status(500).send("Fehler beim Einfügen der Daten");
  }

  passwordList.push(password);

  console.log("Daten eingefügen:", insertedData);

  res.status(200).json(insertedData);
});

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

let currentProcess = null;

app.get("/bruteForceSimple", async (req, res) => {
  const key = req.query.key;
  const password = req.query.pwd || "abc";
  const decodedPwd = passwordDecoder(password, key);
  if (currentProcess) {
    return res.status(400).send("Ein Prozess läuft bereits.");
  }

  currentProcess = bruteForceSimple(decodedPwd);

  currentProcess.promise
    .then((result) => {
      res.send(result);
      currentProcess = null;
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("error occured during brute force process");
      currentProcess = null;
    });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
app.get("/bruteForceLibrary", async (req, res) => {
  const key = req.query.key;
  const password = req.query.pwd;
  const decodedPwd = passwordDecoder(password, key);
  console.log("PWD:", password, "decoded:", decodedPwd);
  try {
    const result = await bruteForceLibrary(decodedPwd, passwordList);
    res.send(result);
    console.log(result);
  } catch (error) {
    if (!passwordList) console.error("data not loaded");
    console.error("Ah shit, here we go again");
    res.status(500).send("error");
  }
});

app.get("/stopBruteForce", (req, res) => {
  if (currentProcess) {
    currentProcess.abort();
    currentProcess = null;
    res.send("process stopped");
    console.log("brute force stopped");
  } else {
    res.status(400).send("no process running");
  }
});

cron.schedule("0 0 * * *", () => {
  console.log("Cron Job wird ausgeführt: updatePasswordList");
  updatePasswordList(["neuesPassword1", "neuesPassword2"]); // Beispielwerte
});

// Start the server and log the URL to the console
app.listen(port, () => {
  console.log(`Server running at ${port}/`);
});
