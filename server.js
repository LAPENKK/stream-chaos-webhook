const express = require("express");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.KICK_CLIENT_ID;
const CLIENT_SECRET = process.env.KICK_CLIENT_SECRET;

const REDIRECT_URI =
    "https://stream-chaos-webhook.onrender.com/oauth/callback";

let oauthState = null;
let codeVerifier = null;

// ===============================
// PÁGINA PRINCIPAL
// ===============================

app.get("/", (req, res) => {
    res.status(200).send(
        "STREAM CHAOS ENGINE - WEBHOOK ONLINE"
    );
});

// ===============================
// DIAGNÓSTICO DE CREDENCIALES
// ===============================

app.get("/test-kick", async (req, res) => {

    try {

        const clientIdExists =
            typeof CLIENT_ID === "string" &&
            CLIENT_ID.length > 0;

        const clientSecretExists =
            typeof CLIENT_SECRET === "string" &&
            CLIENT_SECRET.length > 0;

        console.log("KICK CLIENT ID EXISTS:", clientIdExists);
        console.log(
            "KICK CLIENT SECRET EXISTS:",
            clientSecretExists
        );

        if (!clientIdExists || !clientSecretExists) {

            return res.status(500).json({
                success: false,
                client_id_exists: clientIdExists,
                client_secret_exists: clientSecretExists
            });
        }

        const response = await fetch(
            "https://id.kick.com/oauth/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                },

                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: "client_credentials"
                }).toString()
            }
        );

        const data = await response.json();

        console.log(
            "KICK TEST STATUS:",
            response.status
        );

        console.log(
            "KICK TEST ERROR:",
            data.error || "none"
        );

        console.log(
            "KICK TEST DESCRIPTION:",
            data.error_description || "none"
        );

        if (!response.ok) {

            return res.status(response.status).json({
                success: false,
                kick_error: data.error || null,
                kick_error_description:
                    data.error_description || null
            });
        }

        return res.status(200).json({
            success: true,
            message: "KICK CREDENTIALS ACCEPTED"
        });

    } catch (error) {

        console.error(
            "KICK TEST INTERNAL ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
});

// ===============================
// INICIAR OAUTH
// ===============================

app.get("/oauth/start", (req, res) => {

    oauthState =
        crypto.randomBytes(32).toString("hex");

    codeVerifier =
        crypto.randomBytes(32).toString("base64url");

    const codeChallenge =
        crypto
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
        "https://id.kick.com/oauth/authorize?" +
        params.toString();

    console.log("Iniciando OAuth de Kick...");

    res.redirect(authorizationUrl);
});

// ===============================
// CALLBACK OAUTH
// ===============================

app.get("/oauth/callback", async (req, res) => {

    const { code, state } = req.query;

    if (!code) {
        return res.status(400).send(
            "No authorization code received"
        );
    }

    if (!state || state !== oauthState) {
        return res.status(400).send(
            "Invalid OAuth state"
        );
    }

    try {

        const response = await fetch(
            "https://id.kick.com/oauth/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                },

                body: new URLSearchParams({
                    code: code,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    redirect_uri: REDIRECT_URI,
                    grant_type: "authorization_code",
                    code_verifier: codeVerifier
                }).toString()
            }
        );

        const data = await response.json();

        console.log(
            "OAUTH TOKEN RESPONSE:"
        );

        console.log(
            JSON.stringify(data, null, 2)
        );

        if (!response.ok) {

            return res
                .status(response.status)
                .json(data);
        }

        res.status(200).send(
            "STREAM CHAOS ENGINE - KICK AUTORIZADO CORRECTAMENTE"
        );

    } catch (error) {

        console.error(
            "OAuth error:",
            error
        );

        res.status(500).send(
            "OAuth error"
        );
    }
});

// ===============================
// WEBHOOK
// ===============================

app.post("/webhook", (req, res) => {

    console.log(
        "WEBHOOK RECIBIDO:"
    );

    console.log(
        JSON.stringify(
            req.body,
            null,
            2
        )
    );

    res.status(200).json({
        success: true
    });
});

// ===============================
// SERVIDOR
// ===============================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "Webhook server running on port " +
            PORT
        );

    }
);
