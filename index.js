const dotenv = require('dotenv');
dotenv.config();
const express = require("express");
const app = express();

const tixrRouter = require('./routes/tixrRoute');
const errorHandler = require('./middleWare/errorHandler');
const port = process.env.PORT || 9000;
app.use("/", tixrRouter);
app.use (errorHandler)

app.listen(port, function () {
  console.log(`Server run Successfully on port ${port}`);
});