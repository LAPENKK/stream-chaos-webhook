const express = require("express");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.status(200).send("STREAM CHAOS ENGINE — WEBHOOK ONLINE");
});

app.post("/webhook", (req, res) => {
    console.log("WEBHOOK RECIBIDO:");
    console.log(JSON.stringify(req.body, null, 2));

    res.status(200).json({
        success: true
    });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Webhook server running on port ${PORT}`);
