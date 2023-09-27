const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");
const moment = require('moment');
const attendeeInfo = {
  profiles: [],
};
const getCincinnatiUser = async (req, res,next) => {
  try {
    const timestamp = Math.floor(Date.now());
    const queryParams = new URLSearchParams({
      cpk: process.env.CINCINNATI_CPK_KEY,
      end_date: req.query.end_date||moment().add(1,'days').format('YYYY-MM-D'),
      page_number: req.query.page||1,
      page_size: req.query.page_size||100,
      start_date: req.query.start_date||moment().format('YYYY-MM-D'),
      status: "",
      t: timestamp,
    });

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
        const dataToHash = `/v1/orders/${details.orderId}/custom-form-submissions?cpk=${process.env.CINCINNATI_CPK_KEY}&t=${timestamp}`;
        const algorithm = "sha256";
        const hash = crypto
          .createHmac(algorithm, process.env.CINCINNATI_PRIVATE_KEY)
          .update(dataToHash)
          .digest("hex");
        axios
          .get(
            `https://studio.tixr.com/v1/orders/${details.orderId}/custom-form-submissions?cpk=${process.env.CINCINNATI_CPK_KEY}&t=${timestamp}&hash=${hash}`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          )
          .then((data) => {
            data.data.forEach(function (values) {
              const processItems = (items) => {
                const normalizePhoneNumber = (mobNumber) => {
                  const digitsOnly = mobNumber.replace(/\D/g, "");
                  if (digitsOnly.length < 10) {
                    return null; // Invalid phone number
                  }
            
                  const countryCode =
                    digitsOnly.length === 11 ? "+" + digitsOnly.charAt(0) : "+1";
            
                  const areaCode = digitsOnly.substr(countryCode.length, 3);
                  const phoneDigits = digitsOnly.substr(
                    countryCode.length + areaCode.length
                  );
            
                  const formattedPhoneNumber = `${countryCode} (${areaCode}) ${phoneDigits.slice(
                    0,
                    3
                  )}-${phoneDigits.slice(3)}`;
            
                  return formattedPhoneNumber;
                };
            
                let phoneNumber = "11" + items.answer;
                const standardizedPhoneNumber = normalizePhoneNumber(phoneNumber);
            
                attendeeInfo.profiles.push({
                  first_name: details.first_name,
                  last_name: details.lastname,
                  email: details.email,
                  phone_number: standardizedPhoneNumber,
                  $city: details?.geo_info?.city || "",
                  latitude: details?.geo_info?.latitude || "",
                  longitude: details?.geo_info?.longitude || "",
                  country_code: details.country_code,
                  purchase_date: details.purchase_date,
                  orderId: details.orderId,
                  event_name: details.event_name,
                });
                postUserInfo(attendeeInfo, res);
              
              };
            
              if (values.ticket_submissions.length === 0) {
                values.order_submissions[2].answers.forEach(processItems);
              } else {
                values.ticket_submissions[2].answers.forEach(processItems);
              }
            });
          });
          // postUserInfo(attendeeInfo, res);
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
};


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
    return responseBody;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const postUserInfo = async (req, res) => {
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
        console.log(data)
      }
      const subscribeResult = await subscribeEvent(req);
    } catch (error) {
      console.error('postApi', error );
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