let express = require("express");
let app = express();
let cors = require("cors");
let bodyParser = require("body-parser");
let dbConnect = require("./config/dbConnect");
let https = require("https");
let http = require("http");
let fs = require("fs");
let ws = require("ws");

require("dotenv").config();

let wss = new ws.Server({ server: app });

dbConnect();

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  next();
});

app.use("/PDF", express.static("PDF"));

app.use("/notification", express.static("notification"));

app.use("/autorisation", express.static("autorisation"));

app.use("/api", require("./Routes/User"));

app.use("/api", require("./Routes/Armes"));

app.use("/api", require("./Routes/PDF/PDF"));

app.use("/api", require("./Routes/Email"));

app.use("/api/admin", require("./Routes/Admin"));

app.get("/", (req, res) => {
  res.json({ msg: "ok" });
});

wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(message) {
    console.log("received: %s", message);
  });
  ws.send("some text");
});

http.createServer(app).listen(4000, () => {
  console.log("ok");
});

https
  .createServer(
    {
      key: fs.readFileSync(`${process.env.PRIVATE_KEY}`),
      cert: fs.readFileSync(`${process.env.PRIVATE_CERT}`),
    },
    app
  )
  .listen(5000, () => {
    console.log("ok");
  });
