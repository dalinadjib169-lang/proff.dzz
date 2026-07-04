import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "dummy-key-if-not-set",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
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
