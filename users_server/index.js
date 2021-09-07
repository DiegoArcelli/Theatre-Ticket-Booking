const exp = require("constants");
const express = require("express");
const fs = require("fs")
const PORT = 3000;
const utils = require("./utils")

const app = express();
app.use(express.json());
app.use(express.urlencoded())
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    console.log(__dirname);
    res.redirect("/events_list");
});


app.get("/events_list", (req, res) => {
    console.log(req.body);
    utils.loadHTML("events_list.html", res);
});


app.get("/event_page", (req, res) => {
    if (!req.query.id) {
        return res.status(401).send("Id parameter is missing");
    } 
    utils.loadHTML("event_page.html", res);
});


// server starts to listen for requerst on port 8080
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}/`);
});