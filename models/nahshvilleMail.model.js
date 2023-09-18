const mongoose = require("mongoose");

const NashvilleEmailSchema = new mongoose.Schema(
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

const NashvilleEmailModel = mongoose.model("NashvilleEmailModel", NashvilleEmailSchema);

module.exports = NashvilleEmailModel;
