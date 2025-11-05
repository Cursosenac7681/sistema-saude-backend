import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || "Cursosenac7681";
const REPO_NAME = process.env.REPO_NAME || "sistema-saude";
const FILE_PATH = process.env.FILE_PATH || "unidades.json";
const API_SECRET = process.env.API_SECRET || "";

app.get("/", (req, res) => res.send("✅ Backend ativo. Use POST /update-json"));

app.post("/update-json", async (req, res) => {
  try {
    if (API_SECRET) {
      const provided = req.headers["x-api-secret"] || "";
      if (provided !== API_SECRET)
        return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const jsonData = req.body;
    if (!Array.isArray(jsonData)) return res.status(400).json({ success: false, error: "Body inválido" });

    const getFile = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!getFile.ok) {
      const text = await getFile.text();
      console.error("Erro ao obter arquivo:", text);
      return res.status(400).json({ success: false, error: "Erro ao obter arquivo" });
    }

    const fileData = await getFile.json();
    const sha = fileData.sha;

    const contentBase64 = Buffer.from(JSON.stringify(jsonData, null, 2)).toString("base64");

    const update = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
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

    const result = await update.json();
    if (!update.ok) return res.status(500).json({ success: false, error: "Erro ao atualizar", details: result });

    res.json({ success: true });
  } catch (err) {
    console.error("Erro interno:", err);
    res.status(500).json({ success: false, error: "Erro interno no servidor" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
