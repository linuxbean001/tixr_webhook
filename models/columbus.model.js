const mongoose = require("mongoose");

const ColumbusSchema = new mongoose.Schema(
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

const ColumbusModel = mongoose.model("ColumbusModel", ColumbusSchema);
ColumbusSchema.index({ email: 1 }, { unique: true });
module.exports = ColumbusModel;
