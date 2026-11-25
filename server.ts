import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import webpush from "web-push";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Web Push VAPID Initialization (Persisted locally so subscriptions stay valid across restarts)
const VAPID_FILE = path.join(process.cwd(), ".vapid-keys.json");
const SUBS_FILE = path.join(process.cwd(), ".push-subscriptions.json");

function loadVapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }
  try {
    if (fs.existsSync(VAPID_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, "utf8"));
      if (parsed.publicKey && parsed.privateKey) return parsed;
    }
  } catch (e) {
    console.warn("Could not read .vapid-keys.json:", e);
  }
  const generated = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(generated, null, 2));
  } catch (e) {
    console.warn("Could not persist .vapid-keys.json:", e);
  }
  return generated;
}

const vapidKeys = loadVapidKeys();
webpush.setVapidDetails(
  "mailto:support@teachdz.edu.dz",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

type PushSubMap = Record<string, webpush.PushSubscription[]>;

function loadSubscriptions(): PushSubMap {
  try {
    if (fs.existsSync(SUBS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBS_FILE, "utf8"));
    }
  } catch (e) {
    console.warn("Could not read .push-subscriptions.json:", e);
  }
  return {};
}

function saveSubscriptions(map: PushSubMap) {
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(map, null, 2));
  } catch (e) {
    console.warn("Could not save .push-subscriptions.json:", e);
  }
}

let pushSubscriptions: PushSubMap = loadSubscriptions();

// Initialize Gemini
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "dummy-key-if-not-set",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Web Push API Routes
app.get("/api/push/vapid-public-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post("/api/push/subscribe", (req, res) => {
  try {
    const { uid, subscription } = req.body;
    if (!uid || !subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Invalid subscription payload" });
    }
    const existing = pushSubscriptions[uid] || [];
    const filtered = existing.filter((s) => s.endpoint !== subscription.endpoint);
    filtered.push(subscription);
    // Keep up to 10 recent devices per user
    pushSubscriptions[uid] = filtered.slice(-10);
    saveSubscriptions(pushSubscriptions);
    res.json({ ok: true, count: pushSubscriptions[uid].length });
  } catch (err: any) {
    console.error("Push subscribe error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/push/unsubscribe", (req, res) => {
  try {
    const { uid, endpoint } = req.body;
    if (uid && pushSubscriptions[uid]) {
      pushSubscriptions[uid] = endpoint
        ? pushSubscriptions[uid].filter((s) => s.endpoint !== endpoint)
        : [];
      saveSubscriptions(pushSubscriptions);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/push/send", async (req, res) => {
  try {
    const { recipientId, recipientIds, title, body, icon, tag, url, type } = req.body;
    const targets: string[] = Array.from(
      new Set([
        ...(recipientId ? [recipientId] : []),
        ...(Array.isArray(recipientIds) ? recipientIds : []),
      ])
    ).filter(Boolean);

    if (targets.length === 0) {
      return res.json({ ok: true, sent: 0 });
    }

    const payload = JSON.stringify({
      title: title || "TeachDZ - إشعار جديد",
      body: body || "",
      icon: icon || "/prof_dali_logo.png",
      badge: "/icon-192x192.png",
      tag: tag || `teachdz-${Date.now()}`,
      url: url || "/",
      type: type || "general",
    });

    let sent = 0;
    let changed = false;

    for (const uid of targets) {
      const subs = pushSubscriptions[uid];
      if (!subs || subs.length === 0) continue;

      const validSubs: webpush.PushSubscription[] = [];
      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub, payload, { TTL: 86400, urgency: "high" });
          validSubs.push(sub);
          sent++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            changed = true;
          } else {
            validSubs.push(sub);
          }
        }
      }
      if (validSubs.length !== subs.length) {
        pushSubscriptions[uid] = validSubs;
        changed = true;
      }
    }

    if (changed) saveSubscriptions(pushSubscriptions);
    res.json({ ok: true, sent });
  } catch (err: any) {
    console.error("Push send error:", err);
    res.status(500).json({ error: err.message });
  }
});

// API Routes
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { prompt, model, systemInstruction } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing Gemini API Key on server. Please configure it in settings." });
    }

    const response = await ai.models.generateContent({
      model: model || "gemini-3.5-flash",
      contents: prompt,
      config: systemInstruction ? {
        systemInstruction: systemInstruction,
      } : undefined
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate content" });
  }
});

// AI Report Moderation Route
app.post("/api/admin/moderate-report", async (req, res) => {
  try {
    const { content, authorName, reason, reporterName } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing Gemini API Key on server. Please configure it in settings." });
    }

    const systemInstruction = `You are an AI Moderation Expert for TeachDZ, an Algerian Professional Social Network for Teachers.
The platform is dedicated to education and teacher collaboration.
Strict Play Store Guidelines apply:
- NO Dating, matchmaking, or sexual/romantic content.
- NO Nudity or sexually explicit posts/images.
- NO Violence, blood, or real-life gore.
- NO bot spam, phishing, scams, or hacking attempts.
- Respectful professional Arabic/French/English discussion is required.

Analyze the reported post details and provide a JSON response evaluating if it violates these rules.
The response must be a JSON object with the following structure:
{
  "isViolating": boolean,
  "severity": "low" | "medium" | "high" | "critical",
  "category": "dating_sexual" | "nudity" | "violence" | "respect_issue" | "bot_spam" | "safe",
  "reasoningAr": "Arabic explanation of the analysis (e.g. 'تم اكتشاف محتوى غير لائق...')",
  "recommendedAction": "none" | "delete" | "ban_user"
}`;

    const prompt = `Reported Content Details:
- Author: ${authorName}
- Content: "${content}"
- Reporter Name: ${reporterName || 'Someone'}
- Reported Reason: "${reason}"

Perform moderation analysis and return ONLY the JSON structure.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json({ analysis: result });
  } catch (error: any) {
    console.error("Moderation API Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze content" });
  }
});

// AI Security/Hacking Detection Route
app.post("/api/admin/analyze-threat", async (req, res) => {
  try {
    const { ip, payload, userAgent, path, userEmail } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing Gemini API Key on server." });
    }

    const systemInstruction = `You are a Cyber Security AI Specialist guarding TeachDZ Algerian Educational Social App.
Analyze the request details to check for potential bot attacks, SQL Injection, XSS payloads, suspicious fast tapping, or unauthorized intrusion.
Provide a JSON response with this structure:
{
  "isThreat": boolean,
  "threatType": "DDoS_Bot" | "XSS_Injection" | "SQL_Injection" | "Unauthorized_Access" | "Safe",
  "severity": "low" | "medium" | "high" | "critical",
  "threatExplanationAr": "Arabic explanation of the threat (e.g. 'محاولة اختراق عن طريق حقن سكربتات...')",
  "recommendedAction": "block_ip" | "ban_user" | "monitor" | "none"
}`;

    const prompt = `Suspicious Request Info:
- IP: ${ip || 'unknown'}
- Path Attempted: ${path || '/'}
- Payload: "${payload || ''}"
- User-Agent: ${userAgent || 'unknown'}
- Attempting User Email: ${userEmail || 'anonymous'}

Analyze the danger level and return ONLY the JSON structure.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json({ analysis: result });
  } catch (error: any) {
    console.error("Threat Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze threat" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
