import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: "kiln-ai-ocr-secret",
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: true,
        sameSite: "none",
        httpOnly: true,
      },
    })
  );

  const getRedirectUri = (req: express.Request) => {
    if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
    if (process.env.APP_URL) return `${process.env.APP_URL}/auth/google/callback`;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    return `${protocol}://${req.get('host')}/auth/google/callback`;
  };

  const getOAuth2Client = (req: express.Request) => {
    const cid = process.env.GOOGLE_CLIENT_ID;
    const csec = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!cid || cid.trim() === "" || cid === "undefined") {
      throw new Error("GOOGLE_CLIENT_ID chưa được thiết lập trong Environment Variables.");
    }
    if (!csec || csec.trim() === "" || csec === "undefined") {
      throw new Error("GOOGLE_CLIENT_SECRET chưa được thiết lập trong Environment Variables.");
    }

    return new google.auth.OAuth2(cid, csec, getRedirectUri(req));
  };

  // Auth URL
  app.get("/api/auth/google/url", (req, res) => {
    try {
      const client = getOAuth2Client(req);
      const scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/userinfo.profile",
      ];
      const url = client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent",
      });
      res.json({ url });
    } catch (error: any) {
      console.error("Auth URL error:", error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // Callback
  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const client = getOAuth2Client(req);
      const { tokens } = await client.getToken(code as string);
      (req.session as any).tokens = tokens;
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Error exchanging code for tokens:", error.message);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  // Auth status
  app.get("/api/auth/status", (req, res) => {
    res.json({ authenticated: !!(req.session as any).tokens });
  });

  // Append to Sheets
  app.post("/api/sheets/append", async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { data, spreadsheetId } = req.body;
    const targetSpreadsheetId = spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID;

    if (!targetSpreadsheetId) {
      return res.status(400).json({ error: "Spreadsheet ID is required" });
    }

    try {
      const client = getOAuth2Client(req);
      client.setCredentials(tokens);
      const sheets = google.sheets({ version: "v4", auth: client });

      const row = [
        data.timestamp,
        data.line,
        data.kilnType,
        data.data.CHU_KY_CHAY || "",
        JSON.stringify(data.data)
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: targetSpreadsheetId,
        range: "Sheet1!A:A",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [row],
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error appending to sheets:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy to Google Apps Script Web App
  app.post("/api/sheets/webhook", async (req, res) => {
    const webhookUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!webhookUrl) {
      return res.status(400).json({ error: "GOOGLE_APPS_SCRIPT_URL chưa được thiết lập." });
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      
      // Apps Script often redirects, but fetch handles it.
      // We just want to know if it succeeded.
      res.json({ success: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
