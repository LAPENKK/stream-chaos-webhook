const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.status(200).send("STREAM CHAOS ENGINE - WEBHOOK ONLINE");
});

app.get("/oauth/callback", (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send("No authorization code received");
    }

    console.log("OAUTH CODE RECIBIDO");
    console.log(code);

    res.status(200).send("Stream Chaos Engine: autorización recibida correctamente.");
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
