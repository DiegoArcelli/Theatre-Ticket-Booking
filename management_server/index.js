const exp = require("constants");
const express = require("express");
const session = require('express-session');
const fs = require("fs")
const crypto = require('crypto')
const mysql = require('mysql');
const PORT = 8080;
const utils = require("./utils")

const app = express();
app.use(express.json());
app.use(express.urlencoded())
app.use(express.static(__dirname));
app.use(session({ secret: "test", resave: false, saveUninitialized: true }));


function checkSession(req) {
    if (!req.session.uid) {
        return false;
    }
    return true;
}


app.post("/register_event", (req, res) => {

    console.log(req.body);
    res.send("New show created!");
    var con = utils.connectDB();

    var title = req.body.title;
    var descr = req.body["description"];

    var actors_list = req.body["actors_list"];
    var actors = actors_list.substr(0, actors_list.length - 2);

    var date = req.body["date"];
    var time = req.body["time"];
    var date_time = date + " " + time;

    var duration = req.body["duration"];
    var tickets = req.body["tickets_classes"];
    var sold = req.body["tickets_sold"];

    var nation = req.body["nation"];
    var city = req.body["city"];
    var theatre = req.body["theatre"];

    var location = `${nation}, ${city}`;


    var query = `INSERT INTO spettacoli(titolo, descrizione, attori, durata, biglietti, biglietti_venduti, data_inizio, locazione, nome_teatro) VALUES ('${title}', '${descr}', '${actors}', ${duration}, '${tickets}', '${sold}', '${date_time}', '${location}', '${theatre}')`;
    console.log(query);
    con.query(query, function(err, result) {
        if (err) throw err;
        console.log("1 record inserted");
    });

});

app.get("/", (req, res) => {
    console.log(__dirname);
    if (!checkSession(req)) res.redirect("/login");
    else res.redirect("/events_list");
});


app.get("/login", (req, res) => {
    if (checkSession(req)) res.redirect("/events_list");
    else utils.loadHTML("login.html", res);
});

app.post("/login", (req, res) => {

    var con = utils.connectDB();
    var hashed = crypto.createHash('sha256').update(req.body.password).digest("hex");
    var query = `SELECT * FROM amministratori WHERE nome  = '${req.body.username}'`;

    con.query(query, (err, result, fields) => {
        if (err) throw err;
        console.log(result);
        if (result.length == 1 && result[0].password == hashed) {
            req.session.uid = result[0].id_amministratore;
            res.redirect("/");
        } else {
            res.send("Mhanzed!");
        }
    });

});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.get("/events_list", (req, res) => {
    if (!checkSession(req)) return utils.loadErrorPage(res);
    console.log(req.body);
    utils.loadHTML("events_list.html", res);
});


// api management
app.get("/api", (req, res) => {

    var res_val = utils.checkAPIParams(req);
    console.log(res_val);

    if (res_val.result == "error") {
        res.end(res_val.description);
    } else if (res_val.result == "ok") {
        var con = utils.connectDB();
        con.query(res_val.query, (err, result, fields) => {
            if (err) throw err;

            if (res_val.action == "get") {
                var json_res = utils.handleGetAction(result, res_val.description, res_val.search, res_val.page);
                utils.sendJSON(res, json_res);
            } else if (res_val.action == "buy") {
                var json_res = utils.handleBuyAction(result, res_val.ticket_class, res_val.id);
                console.log(json_res);

                if (json_res.result == "ok") {
                    var inner_con = utils.connectDB();
                    console.log(json_res.query);
                    inner_con.query(json_res.query, (err, result) => {
                        if (err) throw err;
                        console.log(result.affectedRows + " record(s) updated");
                        var json_result =  {result: "successful"};
                        utils.sendJSON(res, json_result);
                    });
                } else if (json_res.result == "error") {
                    utils.sendJSON(res, json_res);
                }

                
            }

        });
    }

});


app.get("/event_page", (req, res) => {
    if (!checkSession(req)) return utils.loadErrorPage(res);
    if (!req.query.id) {
        return res.status(401).send("Id parameter is missing");
    }
    utils.loadHTML("event_page.html", res);
});


app.get("/event_form", (req, res) => {
    if (!checkSession(req)) return utils.loadErrorPage(res);
    utils.loadHTML("event_form.html", res);
});


app.get("/delete_event", (req, res) => {
    if (!checkSession(req)) return utils.loadErrorPage(res);
    if (!req.query.id) return res.status(401).send("The id parameter is missing");

    var query = `DELETE FROM spettacoli WHERE id_spettacolo = ${req.query.id};`;
    con.query(query, (err, result) => {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows);
        res.redirect("/events_list");
    });

});

// server starts to listen for requerst on port 8080
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}/`);
});