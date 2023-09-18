const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");
const TixrModel = require('../models/cincinnati.model')
const DuplicateEmailModel = require('../models/cincinnatiMail.model');

const getCincinnatiUser = async (req, res,next) => {
  try {
    const timestamp = Math.floor(Date.now());
    const queryParams = new URLSearchParams({
      cpk: process.env.CINCINNATI_CPK_KEY,
      end_date: req.query.end_date,
      page_number: req.query.page,
      page_size: req.query.page_size,
      start_date: req.query.start_date,
      status: "",
      t: timestamp,
    });
    const attendeeInfo = {
      profiles: [],
    };
    const duplicateEmails = [];

    const groupResponse = await fetch(
      `${process.env.TIXR_URL}/v1/groups?cpk=${process.env.CINCINNATI_CPK_KEY}`
    );
    const groupData = await groupResponse.json();

    const valuePromises = groupData.map(async (element) => {
      const dataToHash = `/v1/groups/${
        element.id
      }/orders?${queryParams.toString()}`;
      const algorithm = "sha256";
      const hash = crypto
        .createHmac(algorithm, process.env.CINCINNATI_PRIVATE_KEY)
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
            const existingUser = await TixrModel.findOne({ email: tixrUser.email });
            if (!existingUser) {
              // Save the document if the email is not a duplicate
              const savedUser = await tixrUser.save();
              // console.log('Document saved:', savedUser);
            } else {
              console.log('Duplicate email found:', tixrUser.email);
              duplicateEmails.push(tixrUser.email);
              await DuplicateEmailModel.insertMany(duplicateEmails.map(email => ({ email })));
            }
          } catch (err) {
            console.error(err);
          }
        }
        saveTixrUser();
        postUserInfo(attendeeInfo, res);
      });
      trackKlaviyo(orderData)
      res.status(200).json({
        result: orderData,
        success: true,
        message: `Total Record ${orderData.length}`
      });
    });
    await Promise.all(valuePromises);
  } catch (err) {
    return next(err)
  }
    // res.status(500).json({
    //  error: err.message || JSON.stringify(err), success: false })
    //   }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const subscribeEvent = async (contacts) => {
  try {
    const url = `https://a.klaviyo.com/api/v2/list/XSNnkJ/subscribe?api_key=pk_019d39a10598240f0350fc93c6e07acbcc`;
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
  const INITIAL_BACKOFF_MS = 1000; // 1 second

  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const response = await fetch(
        `${process.env.KLAVIYO_URL}/v2/list/${process.env.CINCINNATI_List_Id}/members?api_key=${process.env.CINCINNATI_Klaviyo_API_Key}`,
        {
          method: 'POST',
          body: JSON.stringify(req),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // console.log(data.length)
        // Process data if needed
      }

      const subscribeResult = await subscribeEvent(req);
      break;
    } catch (error) {
      console.error('postApi', error );

      // if (error instanceof FetchError && error.code === '429') {
      //   // Extract the "Retry-After" header value in seconds
      //   const retryAfter = parseInt(error.headers.get('Retry-After'), 10) || INITIAL_BACKOFF_MS / 1000;

      //   // Wait for the specified duration before retrying
      //   await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

      //   // Increase the backoff duration for subsequent retries
      //   retries++;
      // } else {
      //   // Handle other errors if needed
      //   break;
      // }
    }
  }
};

const trackKlaviyo = (res) => {
  res.map((events) => {
    let data = JSON.stringify({
      token: "Suc7vS",
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
        console.log(JSON.stringify(response.data));
      })
      .catch((error) => {
        console.log(error);
      });
  });
};


module.exports = { getCincinnatiUser };