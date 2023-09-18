const mongoose = require("mongoose");

const NashvilleSchema = new mongoose.Schema(
  {
    first_name:String ,
    last_name:String,
    email: {
      type: String,
      unique: true, // Set the unique option to true
    },
     
    $city:String ,
    latitude:String ,
    longitude:String ,
    country_code:String ,
    purchase_date:String ,
    orderId: {
      type: String,
      unique: true, // Set the unique option to true
    } ,
    event_name:String ,
    
  },
  {
    versionKey: false,
  }
);

const NashvilleModel = mongoose.model("NashvilleModel", NashvilleSchema);
NashvilleSchema.index({ orderId: 1 }, { unique: true });
module.exports = NashvilleModel;
