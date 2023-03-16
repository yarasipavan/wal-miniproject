// import express application from server.js
const app = require("./server");
//configure dotenv
require("dotenv").config();

let port = process.env.PORT || 4000;

app.listen(port, () => console.log("Server started on port : ", port));
