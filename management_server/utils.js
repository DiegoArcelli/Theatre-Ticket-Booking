// loads the specified HTML page and sends it to the client

const { json } = require("body-parser");
const fs = require("fs")
const mysql = require('mysql');
const { type } = require("os");

module.exports = {

    loadHTML: function loadHTML(file_name, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        var readStream = fs.createReadStream(`./public/${file_name}`, "utf8")
        readStream.pipe(res);
    },

    sendJSON: function sendJSON(res, json) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(json));
        console.log(json);
    },

    loadErrorPage: function loadErrorPage(res) {
        res.writeHead(401, {'Content-Type': 'text/html'});
        var readStream = fs.createReadStream(`./public/redirect.html`, "utf8")
        readStream.pipe(res);
    },
    
    // establish the connection with the database
    connectDB: function connectDB() {
        var con = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "spettacoli_db"
        });
    
        con.connect(function(err) {
            if (err) throw err;
            console.log("Connected!");
        });
        return con;
    },


    checkParamValue: function checkParamValue(param_name, param_value, possible_values, mandatory, default_value) {

        if (param_value == undefined && mandatory) {
            return {
                result: "error",
                description: `the parameter ${param_name} must be defined`
            };
        } else if (param_value == undefined) {
            return {
                result: "ok",
                value: default_value
            };
        }


        if (typeof possible_values == "string") {
            if (possible_values == "integer") {
                if (!(!isNaN(param_value) &&  parseInt(Number(param_value)) == param_value &&  !isNaN(parseInt(param_value, 10)))) {
                    return {
                        result: "error",
                        description: `wrong value for parameter ${param_name}`
                    };
                }

            }
        } else {
            if (!possible_values.includes(param_value)) {
                return {
                    result: "error",
                    description: `wrong value for parameter ${param_name}`
                };
            }
        }

        return {
            result: "ok",
            value: param_value
        };



    },

    checkAPIParams: function checkAPIParams(req) {

        var action = req.query.action;
        var action_res = this.checkParamValue("action", action, ["get", "buy"], true);
        var result_json = {}
        var query = "";

        // checking the correctness of the parameter action
        if (action_res.result == "error") {
            return action_res;
        } else if (action_res.result == "ok")  {
            
            if (action == "get") {

                query += "SELECT * FROM spettacoli";
                result_json.action = "get";

                // checking the correctness of the parameter search
                var search = req.query.search;
                var search_res = this.checkParamValue("search", search, ["exact", "list"], true);  
                result_json.search = search;              

                //checking the correctness of the parameter description
                var descr = req.query.description;
                var descr_res = this.checkParamValue("description", descr, ["short", "long"], true);

                result_json.description = descr;

                if (descr_res.result == "error") return descr_res;


                if (search_res.result == "error") {
                    return search_res;
                } else if (search_res.result == "ok") {


                    if (search == "exact") {

                        var id = req.query.id;
                        var id_res = this.checkParamValue("id", id, "integer", true);
                        if (id_res.result == "error") return id_res;

                        query += ` WHERE id_spettacolo = ${id};`;
                        result_json.query = query;



                    } else if (search == "list") {

                        var keyword  = req.query.keyword;
                        var keyword_res = this.checkParamValue("keyword", keyword, "string", false, "");
                        if (keyword_res.result == "error") return keyword_res;
                        else keyword = keyword_res.value;

                        var page = req.query.page
                        var page_res = this.checkParamValue("page", page, "integer", false, 1);
                        if (page_res.result == "error") return page_res;
                        else page = page_res.value;

                        var order = req.query.order;
                        var order_res = this.checkParamValue("order", order, ["asc", "desc"], false, "desc");
                        if (order_res.result == "error") return order_res;
                        else order = order_res.value;

                        query += ` WHERE titolo LIKE '%${keyword}%' ORDER BY data_inizio ${order};`;

                        result_json.page = page;
                        result_json.query = query;

                    }


                }


            } else if (action == "buy") {

                result_json.action = "buy";

                var id = req.query.id;
                var id_res = this.checkParamValue("id", id, "integer", true);
                if (id_res.result == "error") return id_res;

                var ticket_class = req.query.class;
                var class_res = this.checkParamValue("class", ticket_class, "string", true);
                if (class_res.result == "error") return class_res;

                result_json.ticket_class = ticket_class;
                result_json.id = id;

                result_json.query = `SELECT biglietti, biglietti_venduti FROM spettacoli WHERE id_spettacolo = ${id};`;
                
            }

            result_json.result = "ok";
            return result_json;

        }

    },
    

    handleBuyAction: function handleBuyAction(res, ticket_class, id) {

        var json_res = {};

        var result = res[0];
        var tickets = JSON.parse(result["biglietti"]);
        var sold = JSON.parse(result["biglietti_venduti"]);
        console.log(tickets);
        console.log(sold);
        console.log(ticket_class)
        if (tickets[ticket_class] == undefined) {
            json_res.result = "error";
            json_res.description = "The selected classes does not exists";
        } else if (tickets[ticket_class].available > sold[ticket_class]) {
            sold[ticket_class]++;
            let query = `UPDATE spettacoli SET biglietti_venduti = '${JSON.stringify(sold)}' WHERE id_spettacolo = ${id};`; 
            json_res.query = query;
            json_res.result = "ok";
        } else {
            json_res.result = "error";
            json_res.description = "All the tickets have been sold";
        }

        return json_res;
    },
    
    handleGetAction: function handleGetAction(res, descr, search, page) {

        console.log(descr);

        if (descr == "short") {
            var json_res = this.shortDescription(res, search, page)
        } else if (descr == "long") {
            var json_res = this.longDescription(res, search, page);
        }
        return json_res

    },

    shortDescription: function shortDescription(result, search, page) {

        console.log(search);
        
        var json_res = {
            type: "short description",
        };

        if (search == "list") {

            let N = 3
            result = result.slice((page-1)*N, (page-1)*N+N);

            json_res.shows_list = [];

            for (show of result) {
                let title =  show["titolo"];
                let date = show["data_inizio"];
                let id = show["id_spettacolo"];
                let location = show["locazione"];
                let theatre = show["nome_teatro"];

                json_res.shows_list.push({
                    id: id,
                    title: title,
                    date: date,
                    location: location,
                    theatre: theatre
                });
        
            }
        } else if (search == "exact") {
            
            let title =  result[0]["titolo"];
            let date = result[0]["data_inizio"];
            let id = result[0]["id_spettacolo"];
            let location = result[0]["locazione"];
            let theatre = result[0]["nome_teatro"];

            json_res.id = id;
            json_res.title = title;
            json_res.date = date;
            json_res.location = location;
            json_res.theatre = theatre;
        }
    

        return json_res;
    
    },


    longDescription: function longDescription(result, search) {        
        var json_res = {
            type: "long description",
        };

        if (search == "list") {

            json_res.shows_list = [];

            for (show of result) {
                let title =  show["titolo"];
                let actors = show["attori"];
                let descr = show["descrizione"];
                let date = show["data_inizio"];
                let id = show["id_spettacolo"];
                let location = show["locazione"];
                let theatre = show["nome_teatro"];
                let duration = show["durata"];
                let tickets = show["biglietti"];
                let sold = show["biglietti_venduti"];

                json_res.shows_list.push({
                    id: id,
                    title: title,
                    description: descr,
                    actors: actors,
                    date: date,
                    location: location,
                    theatre: theatre,
                    duration: duration,
                    tickets_available: JSON.parse(tickets),
                    tickets_sold: JSON.parse(sold)
                });
        
            }
        } else if (search == "exact") {
            
            let title =  result[0]["titolo"];
            let actors = result[0]["attori"];
            let descr = result[0]["descrizione"];
            let date = result[0]["data_inizio"];
            let id = result[0]["id_spettacolo"];
            let location = result[0]["locazione"];
            let theatre = result[0]["nome_teatro"];
            let duration = result[0]["durata"];
            let tickets = result[0]["biglietti"];
            let sold = result[0]["biglietti_venduti"];

            json_res.id = id;
            json_res.title = title;
            json_res.description = descr;
            json_res.actors = actors;
            json_res.date = date;
            json_res.location = location;
            json_res.theatre = theatre;
            json_res.duration = duration;
            json_res.tickets_available = JSON.parse(tickets),
            json_res.sold = JSON.parse(sold)
        }
    

        return json_res;
    }


}