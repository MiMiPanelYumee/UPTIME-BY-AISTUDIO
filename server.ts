import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize SQLite Database
const db = new Database("uptime.db");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'UNKNOWN',
    last_ping INTEGER,
    uptime_percent REAL DEFAULT 100,
    total_pings INTEGER DEFAULT 0,
    successful_pings INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ping_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id INTEGER,
    timestamp INTEGER,
    status TEXT,
    response_time INTEGER,
    FOREIGN KEY(url_id) REFERENCES urls(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Helper to get settings
const getSetting = (key: string) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? row.value : null;
};

const setSetting = (key: string, value: string) => {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
};

// Telegram Notification
const sendTelegramNotification = async (message: string) => {
  const botToken = getSetting("telegram_bot_token");
  const chatId = getSetting("telegram_chat_id");
  
  if (!botToken || !chatId) return;

  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML"
    });
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
};

// Pinging Engine
const pingUrl = async (urlObj: any) => {
  const start = Date.now();
  let status = "DOWN";
  let responseTime = 0;

  try {
    const response = await axios.get(urlObj.url, { timeout: 10000 });
    responseTime = Date.now() - start;
    if (response.status >= 200 && response.status < 400) {
      status = "RUN";
    }
  } catch (error) {
    responseTime = Date.now() - start;
    status = "ERROR";
  }

  const timestamp = Date.now();

  // Check if status changed
  if (urlObj.status !== "UNKNOWN" && urlObj.status !== status) {
    const statusIcon = status === "RUN" ? "✅" : "❌";
    await sendTelegramNotification(`${statusIcon} <b>${urlObj.name}</b> is now <b>${status}</b>\nURL: ${urlObj.url}\nTime: ${new Date(timestamp).toLocaleString()}`);
  }

  // Update DB
  const successfulPings = urlObj.successful_pings + (status === "RUN" ? 1 : 0);
  const totalPings = urlObj.total_pings + 1;
  const uptimePercent = (successfulPings / totalPings) * 100;

  db.prepare(`
    UPDATE urls 
    SET status = ?, last_ping = ?, uptime_percent = ?, total_pings = ?, successful_pings = ?
    WHERE id = ?
  `).run(status, timestamp, uptimePercent, totalPings, successfulPings, urlObj.id);

  db.prepare(`
    INSERT INTO ping_history (url_id, timestamp, status, response_time)
    VALUES (?, ?, ?, ?)
  `).run(urlObj.id, timestamp, status, responseTime);

  // Keep only last 100 pings per URL to save space
  db.prepare(`
    DELETE FROM ping_history 
    WHERE id NOT IN (
      SELECT id FROM ping_history WHERE url_id = ? ORDER BY timestamp DESC LIMIT 100
    ) AND url_id = ?
  `).run(urlObj.id, urlObj.id);
};

// Background Loop
setInterval(() => {
  const urls = db.prepare("SELECT * FROM urls").all();
  urls.forEach(pingUrl);
}, 10000); // Ping every 10 seconds

// Hourly Report
setInterval(async () => {
  const urls = db.prepare("SELECT * FROM urls").all() as any[];
  if (urls.length === 0) return;

  let report = "📊 <b>Hourly Uptime Report</b>\n\n";
  urls.forEach(u => {
    const statusIcon = u.status === "RUN" ? "🟢" : "🔴";
    report += `${statusIcon} <b>${u.name}</b>: ${u.uptime_percent.toFixed(2)}% Uptime\n`;
  });

  await sendTelegramNotification(report);
}, 60 * 60 * 1000);

// API Routes
app.get("/api/urls", (req, res) => {
  const urls = db.prepare("SELECT * FROM urls").all();
  res.json(urls);
});

app.post("/api/urls", (req, res) => {
  const { url, name } = req.body;
  try {
    const info = db.prepare("INSERT INTO urls (url, name) VALUES (?, ?)").run(url, name);
    res.json({ id: info.lastInsertRowid, url, name, status: 'UNKNOWN', uptime_percent: 100 });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/api/urls/:id", (req, res) => {
  db.prepare("DELETE FROM urls WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/history/:url_id", (req, res) => {
  const history = db.prepare("SELECT * FROM ping_history WHERE url_id = ? ORDER BY timestamp ASC").all(req.params.url_id);
  res.json(history);
});

app.get("/api/settings", (req, res) => {
  res.json({
    telegram_bot_token: getSetting("telegram_bot_token") || "",
    telegram_chat_id: getSetting("telegram_chat_id") || ""
  });
});

app.post("/api/settings", (req, res) => {
  const { telegram_bot_token, telegram_chat_id } = req.body;
  setSetting("telegram_bot_token", telegram_bot_token);
  setSetting("telegram_chat_id", telegram_chat_id);
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
