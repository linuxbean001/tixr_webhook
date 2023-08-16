const mongoose = require('mongoose');

const TixrSchema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    email: String,
    phone_number: String,
    $city: String,
    latitude: String,
    longitude: String,
    country_code: String,
    geo_info:Object,
    // purchase_date: Date,
    orderId: String,
    event_name: String,
})

const TixrModel = mongoose.model('TixrModel', TixrSchema);

module.exports = TixrModel