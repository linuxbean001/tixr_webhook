const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");
const moment = require('moment');
const attendeeInfo = {
  profiles: [],
};

const getColumbusUser = async (req, res) => {
  const timestamp = Math.floor(Date.now());
  const queryParams = new URLSearchParams({
    cpk: process.env.COLUMBUS_CPK_KEY,
    end_date: req.query.end_date || moment().add(1, 'days').format('YYYY-MM-D'),
    page_number: req.query.page || 1,
    page_size: req.query.page_size || 100,
    start_date: req.query.start_date || moment().format('YYYY-MM-D'),
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
    res.status(200).json({
      result: orderData,
      success: true,
      message: `Total Record ${orderData.length}`
    });
    getMobileNumber(orderData);
  });

  await Promise.all(valuePromises);

}


const getMobileNumber = async (orderData) => {
  const timestamp = Math.floor(Date.now());
  let standardizedPhoneNumber;
  let details;
  for (details of orderData) {
    // const dataToHash = `/v1/orders/${details.orderId}/custom-form-submissions?cpk=${process.env.COLUMBUS_CPK_KEY}&t=${timestamp}`;
    // const algorithm = "sha256";
    // const hash = crypto
    //   .createHmac(algorithm, process.env.COLUMBUS_PRIVATE_KEY)
    //   .update(dataToHash)
    //   .digest("hex");

    // try {
    //   const response = await axios.get(
    //     `https://studio.tixr.com/v1/orders/${details.orderId}/custom-form-submissions?cpk=${process.env.COLUMBUS_CPK_KEY}&t=${timestamp}&hash=${hash}`,
    //     {
    //       headers: {
    //         Accept: "application/json",
    //       },
    //     }
    //   );

    //   response.data.forEach(function (values) {
    //     const processItems = (items) => {
    //       const normalizePhoneNumber = (mobNumber) => {
    //         const digitsOnly = mobNumber.replace(/\D/g, "");
    //         if (digitsOnly.length < 10) {
    //           return null; // Invalid phone number
    //         }
    //         const countryCode =
    //           digitsOnly.length === 11 ? "+" + digitsOnly.charAt(0) : "+1";

    //         const areaCode = digitsOnly.substr(countryCode.length, 3);
    //         const phoneDigits = digitsOnly.substr(
    //           countryCode.length + areaCode.length
    //         );

    //         const formattedPhoneNumber = `${countryCode} (${areaCode}) ${phoneDigits.slice(
    //           0,
    //           3
    //         )}-${phoneDigits.slice(3)}`;

    //         return formattedPhoneNumber;
    //       };

    //       let phoneNumber = "11" + items.answer;
    //       standardizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    //     };

    //     if (values.ticket_submissions.length === 0) {
    //       values.order_submissions[2].answers.forEach(processItems);
    //     } else {
    //       values.ticket_submissions[2].answers.forEach(processItems);
    //     }
    //   });
    // } catch (error) {
    //   console.error("Error:", error);
    // }
       getOrderData(standardizedPhoneNumber, details)
  }
  
};


const getOrderData = async (orderData, details) => {
  try {
    attendeeInfo.profiles.push({
      first_name: details.first_name,
      last_name: details.lastname,
      email: details.email,
      phone_number: orderData || "",
      $city: details?.geo_info?.city || "",
      latitude: details?.geo_info?.latitude || "",
      longitude: details?.geo_info?.longitude || "",
      country_code: details.country_code,
      purchase_date: details.purchase_date,
      orderId: details.orderId,
      event_name: details.event_name,
    });
    postUserInfo(attendeeInfo);
    trackKlaviyo(attendeeInfo)
  } catch (err) {
    console.log(err)
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
};

const trackKlaviyo = (res) => {
  let data 
    res.profiles.forEach((user)=>{
      data = JSON.stringify({
        token: "Ri9wyv",
        event: user.event_name,
        customer_properties: {
          email: user.email,
          first_name: user.first_name,
          last_name: user.lastname,
          phone_number: user.phone_number,
        }
      })
    })
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
        console.log(trackData);
      })
      .catch((error) => {
        console.log(error);
      });
};

module.exports = { getColumbusUser };