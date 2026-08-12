const express = require("express");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.KICK_CLIENT_ID;
const CLIENT_SECRET = process.env.KICK_CLIENT_SECRET;

const REDIRECT_URI =
    "https://stream-chaos-webhook.onrender.com/oauth/callback";

// Guardamos temporalmente el estado y el verifier del proceso OAuth
let oauthState = null;
let codeVerifier = null;

app.get("/", (req, res) => {
    res.status(200).send("STREAM CHAOS ENGINE - WEBHOOK ONLINE");
});

// INICIAR OAUTH
app.get("/oauth/start", (req, res) => {

    oauthState = crypto.randomBytes(32).toString("hex");

    codeVerifier = crypto.randomBytes(32).toString("base64url");

    const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");

    const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: "user:read events:subscribe",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: oauthState
    });

    const authorizationUrl =
        "https://id.kick.com/oauth/authorize?" + params.toString();

    console.log("Iniciando OAuth de Kick...");

    res.redirect(authorizationUrl);
});

// CALLBACK OAUTH
app.get("/oauth/callback", async (req, res) => {

    const { code, state } = req.query;

    if (!code) {
        return res.status(400).send("No authorization code received");
    }

    if (!state || state !== oauthState) {
        return res.status(400).send("Invalid OAuth state");
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
                code: code,
                code_verifier: codeVerifier
            })
        });

        const data = await response.json();

        console.log("OAUTH TOKEN RESPONSE:");
        console.log(JSON.stringify(data, null, 2));

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.status(200).send(
            "STREAM CHAOS ENGINE - KICK AUTORIZADO CORRECTAMENTE"
        );

    } catch (error) {

        console.error("OAuth error:", error);

        res.status(500).send("OAuth error");
    }
});

// WEBHOOK
app.post("/webhook", (req, res) => {

    console.log("WEBHOOK RECIBIDO:");

    console.log(
        JSON.stringify(req.body, null, 2)
    );

    res.status(200).json({
        success: true
    });
});

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        "Webhook server running on port " + PORT
    );

});
