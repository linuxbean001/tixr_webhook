const mongoose = require("mongoose");

const CincinnatiSchema = new mongoose.Schema(
  {
    first_name:String ,
    last_name:String,
    email: {
      type: String,
      unique: true, // Set the unique option to true
    },
     // phone_number:String standardizedPhoneNumber1,
    $city:String ,
    latitude:String ,
    longitude:String ,
    country_code:String ,
    purchase_date:String ,
    orderId:String ,
    event_name:String ,
    
  },
  {
    versionKey: false,
  }
);

const CincinnatiModel = mongoose.model("CincinnatiModel", CincinnatiSchema);
CincinnatiSchema.index({ email: 1 }, { unique: true });
module.exports = CincinnatiModel;
