// loads the specified HTML page and sends it to the client

const { json } = require("body-parser");
const fs = require("fs")
const { type } = require("os");

module.exports = {

    loadHTML: function loadHTML(file_name, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        var readStream = fs.createReadStream(`./public/${file_name}`, "utf8")
        readStream.pipe(res);
    }


}