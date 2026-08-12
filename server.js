const express = require("express");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.KICK_CLIENT_ID;
const CLIENT_SECRET = process.env.KICK_CLIENT_SECRET;

const REDIRECT_URI =
    "https://stream-chaos-webhook.onrender.com/oauth/callback";

const WEBHOOK_URL =
    "https://stream-chaos-webhook.onrender.com/webhook";

// ID confirmado de tu cuenta Kick
const BROADCASTER_USER_ID = 123713183;

// =====================================================
// ESTADO
// =====================================================

let accessToken = null;
let oauthState = null;
let codeVerifier = null;

// Cola de eventos para Stream Chaos Engine
const eventQueue = [];


// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

app.get("/", (req, res) => {
    res.status(200).send(
        "STREAM CHAOS ENGINE - WEBHOOK ONLINE"
    );
});


// =====================================================
// INICIAR OAUTH
// =====================================================

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


// =====================================================
// CALLBACK OAUTH
// =====================================================

app.get("/oauth/callback", async (req, res) => {

    const code = req.query.code;
    const state = req.query.state;

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
                    "Accept":
                        "application/json"
                },

                body: new URLSearchParams({
                    code: code,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    redirect_uri: REDIRECT_URI,
                    grant_type:
                        "authorization_code",
                    code_verifier:
                        codeVerifier
                }).toString()
            }
        );

        const data =
            await response.json();

        console.log(
            "OAUTH TOKEN RESPONSE:"
        );

        console.log(
            JSON.stringify(
                {
                    token_type:
                        data.token_type,
                    expires_in:
                        data.expires_in,
                    scope:
                        data.scope,
                    error:
                        data.error,
                    error_description:
                        data.error_description
                },
                null,
                2
            )
        );

        if (!response.ok) {

            return res
                .status(response.status)
                .json(data);
        }

        accessToken =
            data.access_token;

        console.log(
            "KICK ACCESS TOKEN RECIBIDO CORRECTAMENTE"
        );

        console.log(
            "BROADCASTER USER ID:",
            BROADCASTER_USER_ID
        );

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


// =====================================================
// TEST USER
// =====================================================

app.get("/test-user", async (req, res) => {

    if (!accessToken) {

        return res.status(401).json({
            success: false,
            message:
                "No Kick access token available"
        });
    }

    try {

        const response = await fetch(
            "https://api.kick.com/public/v1/users",
            {
                method: "GET",

                headers: {
                    "Authorization":
                        "Bearer " + accessToken,

                    "Accept":
                        "application/json"
                }
            }
        );

        const data =
            await response.json();

        console.log(
            "KICK USER RESPONSE:"
        );

        console.log(
            JSON.stringify(
                data,
                null,
                2
            )
        );

        res.status(
            response.status
        ).json({
            success:
                response.ok,

            broadcaster_user_id:
                BROADCASTER_USER_ID,

            data:
                data
        });

    } catch (error) {

        console.error(
            "USER TEST ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                error.message
        });
    }
});


// =====================================================
// SUSCRIBIR CHAT
// =====================================================

app.get("/subscribe-chat", async (req, res) => {

    if (!accessToken) {

        return res.status(401).json({
            success: false,
            message:
                "No Kick access token available"
        });
    }

    try {

        console.log(
            "Creando suscripción de chat..."
        );

        console.log(
            "Broadcaster:",
            BROADCASTER_USER_ID
        );

        const response = await fetch(
            "https://api.kick.com/public/v1/events/subscriptions",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        "Bearer " + accessToken,

                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body: JSON.stringify({

                    broadcaster_user_id:
                        BROADCASTER_USER_ID,

                    events: [
                        {
                            name:
                                "chat.message.sent",

                            version: 1
                        }
                    ],

                    method:
                        "webhook"
                })
            }
        );

        const data =
            await response.json();

        console.log(
            "KICK SUBSCRIPTION RESPONSE:"
        );

        console.log(
            JSON.stringify(
                data,
                null,
                2
            )
        );

        if (!response.ok) {

            return res
                .status(response.status)
                .json(data);
        }

        res.status(200).json({

            success: true,

            broadcaster_user_id:
                BROADCASTER_USER_ID,

            message:
                "CHAT EVENT SUBSCRIPTION CREATED",

            data:
                data
        });

    } catch (error) {

        console.error(
            "SUBSCRIPTION ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                error.message
        });
    }
});


// =====================================================
// VER SUSCRIPCIONES
// =====================================================

app.get("/subscriptions", async (req, res) => {

    if (!accessToken) {

        return res.status(401).json({
            success: false,
            message:
                "No Kick access token available"
        });
    }

    try {

        const response = await fetch(
            "https://api.kick.com/public/v1/events/subscriptions",
            {
                method: "GET",

                headers: {
                    "Authorization":
                        "Bearer " + accessToken,

                    "Accept":
                        "application/json"
                }
            }
        );

        const data =
            await response.json();

        res.status(
            response.status
        ).json(data);

    } catch (error) {

        console.error(
            "SUBSCRIPTIONS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                error.message
        });
    }
});


// =====================================================
// WEBHOOK DE KICK
// =====================================================

app.post("/webhook", (req, res) => {

    console.log("");
    console.log(
        "================================"
    );

    console.log(
        "🔥 WEBHOOK RECIBIDO DE KICK"
    );

    console.log(
        "================================"
    );

    console.log(
        JSON.stringify(
            req.body,
            null,
            2
        )
    );

    console.log(
        "================================"
    );

    // =================================================
    // CONVERTIR EVENTO KICK A EVENTO STREAM CHAOS
    // =================================================

    const body = req.body;

    const content =
        body.content ||
        body.message?.content ||
        "";

    if (content) {

        console.log(
            "CHAT:",
            content
        );

        // ---------------------------------------------
        // COMANDOS DE PRUEBA
        // ---------------------------------------------

        const normalized =
            content
                .trim()
                .toLowerCase();

        let chaosEvent = null;

        if (
            normalized === "!flash" ||
            normalized === "flash"
        ) {

            chaosEvent = "Flash";

        } else if (
            normalized === "!freeze3" ||
            normalized === "freeze3"
        ) {

            chaosEvent = "Freeze3";

        } else if (
            normalized === "!freeze5" ||
            normalized === "freeze5"
        ) {

            chaosEvent = "Freeze5";

        } else if (
            normalized === "!freeze10" ||
            normalized === "freeze10"
        ) {

            chaosEvent = "Freeze10";

        } else if (
            normalized === "!drop" ||
            normalized === "drop"
        ) {

            chaosEvent = "DropWeapon";
        }

        // ---------------------------------------------
        // AGREGAR A COLA
        // ---------------------------------------------

        if (chaosEvent) {

            const event = {
                type:
                    chaosEvent,

                source:
                    "Kick",

                content:
                    content,

                createdAt:
                    new Date().toISOString()
            };

            eventQueue.push(event);

            console.log(
                "🔥 STREAM CHAOS EVENT:",
                JSON.stringify(
                    event,
                    null,
                    2
                )
            );
        }
    }

    res.status(200).json({
        success: true
    });
});


// =====================================================
// EVENTOS PARA STREAM CHAOS ENGINE
// =====================================================

app.get("/events", (req, res) => {

    if (eventQueue.length === 0) {

        return res.status(204).send();
    }

    const event =
        eventQueue.shift();

    console.log(
        "📤 ENVIANDO EVENTO A STREAM CHAOS:",
        JSON.stringify(
            event,
            null,
            2
        )
    );

    res.status(200).json(
        event
    );
});


// =====================================================
// ESTADO
// =====================================================

app.get("/status", (req, res) => {

    res.status(200).json({

        online: true,

        kickAuthorized:
            accessToken !== null,

        broadcasterUserId:
            BROADCASTER_USER_ID,

        pendingEvents:
            eventQueue.length,

        webhook:
            WEBHOOK_URL
    });
});


// =====================================================
// SERVIDOR
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "Webhook server running on port " +
            PORT
        );

        console.log(
            "Webhook URL:",
            WEBHOOK_URL
        );

        console.log(
            "Events URL:",
            "https://stream-chaos-webhook.onrender.com/events"
        );

        console.log(
            "Broadcaster User ID:",
            BROADCASTER_USER_ID
        );
    }
);
