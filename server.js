const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.KICK_CLIENT_ID;
const CLIENT_SECRET = process.env.KICK_CLIENT_SECRET;
const REDIRECT_URI = "https://stream-chaos-webhook.onrender.com/oauth/callback";

app.get("/", (req, res) => {
    res.status(200).send("STREAM CHAOS ENGINE - WEBHOOK ONLINE");
});

app.get("/oauth/callback", async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send("No authorization code received");
    }

    try {
        const response = await fetch("https://id.kick.com/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                code: code
            })
        });

        const data = await response.json();

        console.log("OAUTH TOKEN RESPONSE:");
        console.log(JSON.stringify(data, null, 2));

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.status(200).send("Stream Chaos Engine: autorización completada correctamente.");
    } catch (error) {
        console.error("OAuth error:", error);
        res.status(500).send("OAuth error");
    }
});

app.post("/webhook", (req, res) => {
    console.log("WEBHOOK RECIBIDO:");
    console.log(JSON.stringify(req.body, null, 2));

    res.status(200).json({
        success: true
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("Webhook server running on port " + PORT);
});
