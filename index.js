const dotenv = require('dotenv');
dotenv.config();
const express = require("express");
const app = express();
const mongoose = require('mongoose');
const tixrRouter = require('./routes/tixrRoute');
const errorHandler = require('./middleWare/errorHandler');
const port = process.env.PORT || 5000;
 
  app.listen(port, () => {
    console.log(`Server run successfully on port ${port}`);
  });
 
 app.use("/", tixrRouter);
app.use(errorHandler)
