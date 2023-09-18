const dotenv = require('dotenv');
dotenv.config();
const express = require("express");
const app = express();
const mongoose = require('mongoose');
const tixrRouter = require('./routes/tixrRoute');
const errorHandler = require('./middleWare/errorHandler');
const port = process.env.PORT || 5000;
const mongodb = "mongodb://127.0.0.1:27017/tixrInfo";
const TixrModel = require('./models/columbus.model')


  mongoose.connect(mongodb, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Database connected');
    app.listen(port, () => {
      console.log(`Server run successfully on port ${port}`);
    });
  })
  .catch((err) => {
    console.error(`Unable to connect to MongoDB: ${err}`);
  });

 
 app.use("/", tixrRouter);
app.use(errorHandler)
