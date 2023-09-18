const mongoose = require("mongoose");

const CinncinnatiEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
    },
  },
  {
    versionKey: false,
  }
);

const CinncinnatiEmailModel = mongoose.model("CinncinnatiEmailModel", CinncinnatiEmailSchema);

module.exports = CinncinnatiEmailModel;
