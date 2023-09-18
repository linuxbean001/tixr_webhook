const mongoose = require("mongoose");

const DuplicateEmailSchema = new mongoose.Schema(
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

const DuplicateEmailModel = mongoose.model("DuplicateEmailModel", DuplicateEmailSchema);

module.exports = DuplicateEmailModel;
