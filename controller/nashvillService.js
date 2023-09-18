const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");
const moment = require('moment');
const TixrModel = require('../models/nashville.model')
const DuplicateEmailModel = require('../models/nahshvilleMail.model');
const attendeeInfo = {
  profiles: [],
};
const getNashvilleUser = async (req, res) => {
  try {
    const timestamp = Math.floor(Date.now());
    const queryParams = new URLSearchParams({
      cpk: process.env.NASHVILLE_CPK_KEY,
      end_date: req.query.end_date||moment().add(1,'days').format('YYYY-MM-D'),
      page_number: req.query.page||1,
      page_size: req.query.page_size||100,
      start_date: req.query.start_date||moment().format('YYYY-MM-D'),
      status: "",
      t: timestamp,
    });
    const duplicateEmails = [];
    const groupResponse = await fetch(
      `${process.env.TIXR_URL}/v1/groups?cpk=${process.env.NASHVILLE_CPK_KEY}`
    );
    const groupData = await groupResponse.json();
    const valuePromises = groupData.map(async (element) => {
      const dataToHash = `/v1/groups/${element.id
        }/orders?${queryParams.toString()}`;
      const algorithm = "sha256";
      const hash = crypto
        .createHmac(algorithm, process.env.NASHVILLE_PRIVATE_KEY)
        .update(dataToHash)
        .digest("hex");
      const orderResponse = await axios.get(
        `${process.env.TIXR_URL}${dataToHash}&hash=${hash}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
     
      const orderData = orderResponse.data;
      
      orderData.map(async (details) => {
        attendeeInfo.profiles.push({
          first_name: details.first_name,
          last_name: details.lastname,
          email: details.email,
          // phone_number: standardizedPhoneNumber1,
          $city: details && details.geo_info && details.geo_info.city ? details.geo_info.city : "",
          latitude: details && details.geo_info && details.geo_info.latitude ? details.geo_info.latitude : "",
          longitude: details && details.geo_info && details.geo_info.longitude ? details.geo_info.longitude : "",
          country_code: details.country_code,
          purchase_date: details.purchase_date,
          orderId: details.orderId,
          event_name: details.event_name,
        });

        async function saveTixrUser() {
          try {
            const tixrUser = new TixrModel({
              first_name: details.first_name,
              last_name: details.lastname,
              email: details.email,
              // phone_number: standardizedPhoneNumber1,
              $city: details && details.geo_info && details.geo_info.city ? details.geo_info.city : "",
              latitude: details && details.geo_info && details.geo_info.latitude ? details.geo_info.latitude : "",
              longitude: details && details.geo_info && details.geo_info.longitude ? details.geo_info.longitude : "",
              country_code: details.country_code,
              purchase_date: details.purchase_date,
              orderId: details.orderId,
              event_name: details.event_name,
            });
            const existingUser = await TixrModel.findOne({ orderId: tixrUser.orderId });
            if (!existingUser) {
              const savedUser = await tixrUser.save();
            } else {
              duplicateEmails.push(tixrUser.orderId);
              await DuplicateEmailModel.insertMany(duplicateEmails.map(orderId => ({ orderId })));
            }

          } catch (err) {
            console.error(err);
          }
        }
        // saveTixrUser();
      });
      const date = new Date();
      console.log(moment().add(1,'days').format('YYYY-MM-D'));
    //  console.log(date)
      postUserInfo(attendeeInfo, res);
      // craterProfile(attendeeInfo)
      res.status(200).json({
        result: orderData,
        success: true,
        message: `Total Record ${orderData.length}`
      });
    });
    await Promise.all(valuePromises);
  } catch (err) {
    console.log(err)
    res.status(500).json({
      success: false,
      message: "An error occurred while processing the request.",
    });
  }
};

const subscribeEvent = async (contacts,orderData) => {
  try {
    const url = `${process.env.KLAVIYO_URL}/v2/list/${process.env.Nashville_List_Id}/subscribe?api_key=${process.env.Nashville_Klaviyo_API_Key}`;
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        profiles: contacts.profiles.map((subscribe_user) => ({
          email: subscribe_user.email,
          phone_number: subscribe_user.phone_number,
          sms_consent: true,
        })),
      }),
    };
    const response = await fetch(url, options);
    const responseBody = await response.json();
    return responseBody;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const postUserInfo = async (req, res) => {
      try {
      const response = await fetch(
        `${process.env.KLAVIYO_URL}/v2/list/${process.env.Nashville_List_Id}/members?api_key=${process.env.Nashville_Klaviyo_API_Key}`,
        {
          method: 'POST',
          body: JSON.stringify(req),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
         await response.json();
       }
      await subscribeEvent(req);
     
    } catch (error) {
      console.error('postApi', error );
    }
 };

const trackKlaviyo = (res) => {
  res.map((events) => {
    let data = JSON.stringify({
      token: "SZcjpi",
      event: events.event_name,
      customer_properties: {
        email: events.email,
        first_name: events.first_name,
        last_name: events.lastname,
        phone_number: events.phone_number,
      }
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://a.klaviyo.com/api/track',
      headers: {
        'Content-Type': 'application/json'
      },
      data: data
    };

    axios.request(config)
      .then((response) => {
        const trackData = JSON.stringify(response.data)
        console.log(trackData.length);
      })
      .catch((error) => {
        console.log(error);
      });
  });
};

const craterProfile=(postProfile)=>{
  const fetch = require('node-fetch');

const url = 'https://a.klaviyo.com/api/profiles/';
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    revision: '2023-09-15',
    'content-type': 'application/json',
    Authorization: 'Klaviyo-API-Key pk_24b1f27b5f87171695ae0795efa61c38a9'
  },
  body: JSON.stringify(postProfile)
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error('error:' + err));
}

module.exports = { getNashvilleUser };