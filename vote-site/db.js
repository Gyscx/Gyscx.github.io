const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const db = new sqlite3.Database("./data.db");

const schema = fs.readFileSync("./schema.sql", "utf8");
db.exec(schema, (err) => {
    if (err) console.error("Schema init error:", err);
    else console.log("DB initialized");
});

module.exports = db;
