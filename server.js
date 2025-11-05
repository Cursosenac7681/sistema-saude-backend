// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors()); // permite chamadas do seu frontend

// CONFIG (copie para Environment Variables no Render)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // token com permissão repo
const REPO_OWNER = process.env.REPO_OWNER || "Cursosenac7681";
const REPO_NAME = process.env.REPO_NAME || "sistema-saude";
const FILE_PATH = process.env.FILE_PATH || "unidades.json";
const API_SECRET = process.env.API_SECRET || ""; // opcional, proteção para /update-json

app.get("/", (req, res) => res.send("✅ Backend ativo. Use POST /update-json"));

// ROTA para atualizar o JSON no GitHub
app.post("/update-json", async (req, res) => {
  try {
    // Se você definiu API_SECRET, exige header x-api-secret igual
    if (API_SECRET) {
      const provided = req.headers["x-api-secret"] || "";
      if (!provided || provided !== API_SECRET) {
        return res.status(403).json({ success: false, error: "Forbidden: invalid API secret" });
      }
    }

    const jsonData = req.body;
    if (!Array.isArray(jsonData)) {
      return res.status(400).json({ success: false, error: "Body must be an array (units)" });
    }

    // 1) Busca o arquivo atual para obter sha
    const getRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!getRes.ok) {
      const txt = await getRes.text();
      console.error("Erro ao obter arquivo:", txt);
      return res.status(500).json({ success: false, error: "Erro ao obter arquivo no GitHub", details: txt });
    }

    const fileJson = await getRes.json();
    const sha = fileJson.sha;

    // 2) Atualiza o arquivo (PUT)
    const contentBase64 = Buffer.from(JSON.stringify(jsonData, null, 2)).toString("base64");
    const updateRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Atualização via painel administrativo",
        content: contentBase64,
        sha,
      }),
    });

    const updateJson = await updateRes.json();
    if (!updateRes.ok) {
      console.error("Erro ao atualizar:", updateJson);
      return res.status(500).json({ success: false, error: "Erro ao atualizar no GitHub", details: updateJson });
    }

    return res.json({ success: true, result: updateJson });
  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ success: false, error: "Erro interno no servidor", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
