const dotenv = require('dotenv');
dotenv.config();
const express = require("express");
const mongoose = require("mongoose");
const TixrModel = require('./models/user.model')
const app = express();

const nashvilleRouter = require('./routes/tixrRoute')
const port = process.env.PORT;
app.use("/", nashvilleRouter);


mongoose.connect("mongodb://0.0.0.0:27017/tixrklaviyo", {
  useNewUrlparser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("connection successfull")
}).catch((error) => {
  console.log(error)
})

// Delete all documents from the TixrModel collection
// TixrModel.deleteMany({}, (err) => {
//   if (err) {
//     console.log("Error deleting documents:", err);
//   } else {
//     console.log("All documents deleted from TixrModel collection");
//   }
// });


app.listen(port, function () {
  console.log(`Server run Successfully on port ${port}`);
});