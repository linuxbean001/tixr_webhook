const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");
const https = require('https');
const TixrModel = require('../models/columbus.model')
const DuplicateEmailModel = require('../models/dupColumbus.model');


const getColumbusUser = async (req, res) => {

  try {
    const timestamp = Math.floor(Date.now());
    const queryParams = new URLSearchParams({
      cpk: process.env.COLUMBUS_CPK_KEY,
      end_date: req.query.end_date,
      page_number: req.query.page,
      page_size: req.query.page_size || 5,
      start_date: req.query.start_date,
      status: "",
      t: timestamp,
    });
    const attendeeInfo = {
      profiles: [],
    };
    const duplicateEmails = [];

    const groupResponse = await fetch(
      `${process.env.TIXR_URL}/v1/groups?cpk=${process.env.COLUMBUS_CPK_KEY}`
    );
    const groupData = await groupResponse.json();
    const valuePromises = groupData.map(async (element) => {
      // return concurrentLimit(async () => {
      const dataToHash = `/v1/groups/${element.id
        }/orders?${queryParams.toString()}`;
      const algorithm = "sha256";
      const hash = crypto
        .createHmac(algorithm, process.env.COLUMBUS_PRIVATE_KEY)
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
      // console.log('response', orderResponse)
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
              console.log('Duplicate email found:', tixrUser.orderId);
              duplicateEmails.push(tixrUser.orderId);
              await DuplicateEmailModel.insertMany(duplicateEmails.map(orderId => ({ orderId })));
            }
          } catch (err) {
            console.error(err);
          }
        }
        
        // Call the async function
        saveTixrUser();

        postUserInfo(attendeeInfo, res);

      });
       console.log('duplicateEmailsArray',duplicateEmails)
      res.status(200).json({
        result: orderData,
        success: true,
        message: `Total Record ${orderData.length}`
      });
    });
    await Promise.all(valuePromises);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || JSON.stringify(err), success: false
    })
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const subscribeEvent = async (contacts) => {
  try {
    const url = `${process.env.KLAVIYO_URL}/v2/list/${process.env.COLUMBUS_List_Id}/subscribe?api_key=${process.env.Columbus_Klaviyo_API_Key}`;
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

    if (response.status === 429 && responseBody.error === "throttled") {
      const retryAfter = responseBody.retry_after * 1000; // Convert to milliseconds
      console.log(`Throttled. Retrying in ${retryAfter / 1000} seconds.`);
      await wait(retryAfter);
      return subscribeEvent(contacts); // Retry the request
    }

    return responseBody;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const postUserInfo = async (req, res) => {
  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const response = await fetch(
        `${process.env.KLAVIYO_URL}/v2/list/${process.env.COLUMBUS_List_Id}/members?api_key=${process.env.Columbus_Klaviyo_API_Key}`,
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
      break;
    } catch (error) {
      console.error('postApi', error);
    }
  }
};

const agent = new https.Agent({
  maxSockets: 10 // You can adjust the maximum number of sockets as needed
});

const trackKlaviyo = (res) => {
  res.profiles.map((events) => {
    let data = JSON.stringify({
      token: "Ri9wyv",
      event: events.event_name,
      customer_properties: {
        email: events.email,
        first_name: events.first_name,
        last_name: events.lastname,
        phone_number: events.phone_number,
      }
    });

    let options = {
      hostname: 'a.klaviyo.com',
      path: '/api/track',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      agent: agent // Use the connection pooling agent
    };

    let req = https.request(options, (response) => {
      let responseData = '';

      response.on('data', (chunk) => {
        responseData += chunk;
      });

      response.on('end', () => {
        console.log(responseData);
      });
    });

    req.on('error', (error) => {
      console.log(error);
    });

    req.write(data);
    req.end();
  });
};

module.exports = { getColumbusUser };