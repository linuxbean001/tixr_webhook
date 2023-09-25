const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");
const https = require('https');
const moment = require('moment');
const attendeeInfo = {
  profiles: [],
};

const getColumbusUser = async (req, res) => {
  try {
    const timestamp = Math.floor(Date.now());
    const queryParams = new URLSearchParams({
      cpk: process.env.COLUMBUS_CPK_KEY,
      end_date: req.query.end_date||moment().add(1,'days').format('YYYY-MM-D'),
      page_number: req.query.page||1,
      page_size: req.query.page_size||100,
      start_date: req.query.start_date||moment().format('YYYY-MM-D'),
      status: "",
      t: timestamp,
    });
   
    const groupResponse = await fetch(
      `${process.env.TIXR_URL}/v1/groups?cpk=${process.env.COLUMBUS_CPK_KEY}`
    );
    const groupData = await groupResponse.json();
    const valuePromises = groupData.map(async (element) => {
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
      const orderData = orderResponse.data;
      orderData.map(async (details) => {
        const dataToHash = `/v1/orders/${details.orderId}/custom-form-submissions?cpk=${process.env.COLUMBUS_CPK_KEY}&t=${timestamp}`;
        const algorithm = "sha256";
        const hash = crypto
          .createHmac(algorithm, process.env.COLUMBUS_PRIVATE_KEY)
          .update(dataToHash)
          .digest("hex");
        axios
          .get(
            `https://studio.tixr.com/v1/orders/${details.orderId}/custom-form-submissions?cpk=${process.env.COLUMBUS_CPK_KEY}&t=${timestamp}&hash=${hash}`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          )
          .then((data) => {
            data.data.forEach(function (values) {
              values.ticket_submissions.length == 0
              const phoneNumber =  values.order_submissions[2].answers || values.ticket_submissions[2].answers;
              phoneNumber.map((items) => {
                    mobNumber = items.answer;
                    // let phoneNumber = "11" + items.answer;
                    attendeeInfo.profiles.push({
                      first_name: details.first_name,
                      last_name: details.lastname,
                      email: details.email,
                      phone_number: mobNumber,
                      $city:
                        details && details.geo_info && details.geo_info.city
                          ? details.geo_info.city
                          : "",
                      latitude:
                        details && details.geo_info && details.geo_info.latitude
                          ? details.geo_info.latitude
                          : "",
                      longitude:
                        details &&
                        details.geo_info &&
                        details.geo_info.longitude
                          ? details.geo_info.longitude
                          : "",
                      country_code: details.country_code,
                      purchase_date: details.purchase_date,
                      orderId: details.orderId,
                      event_name: details.event_name,
                    });
                  });
            });
          });
      });
       postUserInfo(attendeeInfo, res);
       trackKlaviyo(orderData)
      const emailCount = {};
      const duplicateEmails = [];
      orderData.forEach((user) => {
        const email = user.email.toLowerCase();
        if (emailCount[email]) {
          if (emailCount[email] === 1) {
            duplicateEmails.push(email); 
          }
          duplicateEmails.push(email);
          emailCount[email] += 1; 
        } else {
          emailCount[email] = 1;
        }
      });
      
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
    return responseBody;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const postUserInfo = async (req, res) => {
  console.log(req)
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
    } catch (error) {
      console.error('postApi', error);
    }
  }

const trackKlaviyo = (res) => {
  res.map((events) => {
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
    };

    let req = https.request(options, (response) => {
      let responseData = '';
      response.on('data', (chunk) => {
        responseData += chunk;
      });
      response.on('end', () => {
        // console.log('tracked data',responseData);
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