import { config } from "dotenv";
import express from "express";
import axios from "axios";
import cors from "cors";

import { bruteForceSimple } from "./serverScripts/bruteSimple.js";
import { bruteForceLibrary } from "./serverScripts/bruteLibrary.js";
import { passwordDecoder } from "./serverScripts/encoder.js";
import OpenAI from "openai";

config();

const app = express(); // Create an Express application
const port = process.env.PORT || 3000; // Set the port from the environment variable or default to 3000
const dropboxFileUrl = process.env.DROPBOX_FILE_URL; // Set the Dropbox file URL from the environment variable
const openAiKey = process.env.OPENAI_KEY
const openAiUrl = process.env.OPENAI_URL
app.use(cors());

let passwordList;

async function loadPasswordList() {
  try {
    const response = await axios.get(dropboxFileUrl, {
      responseType: "text",
    });
    passwordList = response.data.split("\n").filter((line) => line !== "");
    console.log("data loaded");
  } catch (error) {
    console.error("dropbbox fail", error);
  }
}

loadPasswordList();

app.get("/apiCall", async (req, res) => {
  const openai = new OpenAI({
    apiKey: openAiKey,
    baseURL: openAiUrl,
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
    baseURL: openAiUrl,
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
    console.log(result);
  } catch (error) {
    console.log(error);
    res.send("no");
  }
});

app.get("/", (req, res) => {
  res.send("hello world");
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

  setTimeout(() => {

    currentProcess.abort()
    currentProcess = null;

  },5000)


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
// Start the server and log the URL to the console
app.listen(port, () => {
  console.log(`Server running at ${port}/`);
});
