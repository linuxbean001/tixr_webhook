const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");
const TixrModel = require('../models/user.model');

const fetchCustomFormSubmissions = async (orderId, timestamp, cpk, hash) => {
  const url = `${process.env.TIXR_URL}/v1/orders/${orderId}/custom-form-submissions?cpk=${cpk}&t=${timestamp}&hash=${hash}`;
  const response = await axios.get(url);
  response.data.map((details) => {
    details.ticket_submissions.map((items) => {
      const dataArray = items.answers
      const extractMobileNumbers = (dataArray) => {
        const mobileNumbers = [];
        const mobileNumberRegex = /^[0-9]{10}$/; // Assuming mobile numbers are 10 digits long
        for (const item of dataArray) {
          if (item.answer && mobileNumberRegex.test(item.answer)) {
            mobileNumbers.push(item.answer);
          }
        }
        return mobileNumbers;
      };
      const mobileNumbers = extractMobileNumbers(dataArray);
    })
  })
  return response.data;
};

const processValueData = async (value, attendeeInfo) => {
  // console.log(attendeeInfo)
  const { orderId, first_name, last_name, email, geo_info, country_code, purchase_date, event_name } = value;
  const timestamp = Math.floor(Date.now());
  const dataToHash = `/v1/orders/${orderId}/custom-form-submissions?cpk=${process.env.NASHVILLE_CPK_KEY}&t=${timestamp}`;
  const algorithm = "sha256";
  const hash = crypto
    .createHmac(algorithm, process.env.NASHVILLE_PRIVATE_KEY)
    .update(dataToHash)
    .digest("hex");

  const details = await fetchCustomFormSubmissions(orderId, timestamp, process.env.NASHVILLE_CPK_KEY, hash);
  const mobileNumbers = [];

  if (details && details.ticket_submissions) {
    for (const item of details.ticket_submissions) {
      if (item.answers && Array.isArray(item.answers)) {
        for (const answer of item.answers) {
          if (answer.answer && mobileNumberRegex.test(answer.answer)) {
            mobileNumbers.push(answer.answer);
          }
        }
      }
    }
  }
  const tixrData = new TixrModel({
    first_name,
    last_name,
    email,
    geo_info,
    country_code,
    purchase_date,
    orderId,
    event_name,
    phone_number: mobileNumbers.join(', ')
  });
  await tixrData.save();
};

const getNashvilleUser = async (req, res) => {
  try {
    const timestamp = Math.floor(Date.now());
    const queryParams = new URLSearchParams({
      cpk: process.env.NASHVILLE_CPK_KEY,
      end_date: req.query.end_date,
      page_number: req.query.page,
      page_size: req.query.page_size || 10,
      start_date: req.query.start_date,
      status: "",
      t: timestamp,
    });

    const attendeeInfo = {
      profiles: [],
    };


    const groupResponse = await fetch(`${process.env.TIXR_URL}/v1/groups?cpk=${process.env.NASHVILLE_CPK_KEY}`);
    const groupData = await groupResponse.json();

    const valuePromises = groupData.map(async (element) => {
      const dataToHash = `/v1/groups/${element.id}/orders?${queryParams.toString()}`;
      const algorithm = "sha256";
      const hash = crypto
        .createHmac(algorithm, process.env.NASHVILLE_PRIVATE_KEY)
        .update(dataToHash)
        .digest("hex");

      const orderResponse = await axios.get(`${process.env.TIXR_URL}${dataToHash}&hash=${hash}`, {
        headers: {
          Accept: "application/json",
        },
      });
      const orderData = orderResponse.data;
      orderData.map((details) => {
        attendeeInfo.profiles.push({
          first_name: details.first_name,
          last_name: details.lastname,
          email: details.email,
          phone_number:
          +13144965652,
          $city:
            details && details.geo_info && details.geo_info.city
              ? details.geo_info.city
              : "",
          latitude:
            details && details.geo_info && details.geo_info.latitude
              ? details.geo_info.latitude
              : "",
          longitude:
            details && details.geo_info && details.geo_info.longitude
              ? details.geo_info.longitude
              : "",
          country_code: details.country_code,
          purchase_date: details.purchase_date,
          orderId: details.orderId,
          event_name: details.event_name,
        });
        postUserInfo(attendeeInfo)
      })
    
      return orderData.map(value => processValueData(value, attendeeInfo));
    });

    await Promise.all(valuePromises);
    // ... your existing attendeeInfo processing ...
    res.status(200).json({
      result: attendeeInfo.profiles,
      success: true,
      message: `Attendee Details Post Successfully ${attendeeInfo.profiles.length}`,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
};


//Post UserInformation Klaviyo
const postUserInfo = async (req, res) => {
  // console.log(req)
  // setTimeout(() => {
  //   subscribeEvent(req);
  // }, 5000)

  try {
    await axios
      .post(
        `${process.env.KLAVIYO_URL}/v2/list/${process.env.Nashville_List_Id}/members?api_key=pk_24b1f27b5f87171695ae0795efa61c38a9`,
        req
      )
      .then((data) => {
        console.log(data)
      }).catch((erre)=>{
        console.log(erre)
      })

    return { success: true, message: "Attendee Details Post wait" }; // Return the response data
  } catch (error) {
  }
};

// Subscribe the user event
const subscribeEvent = async (contacts) => {
  contacts.profiles.map((subscribe_user) => {
    const url = `https://a.klaviyo.com/api/v2/list/XtR3dQ/subscribe?api_key=pk_24b1f27b5f87171695ae0795efa61c38a9`;
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        profiles: [
          { email: subscribe_user.email },
          { phone_number: subscribe_user.phone_number, sms_consent: true },
        ],
      }),
    };
    fetch(url, options)
      .then((res) => res.json())
      .then((json) => console.log(json))
      // req.end()
      .catch((err) => console.error("error:" + err));
  });
};

const trackKlaviyo = (res) => {
  res.map((events) => {
    const travkItem = {
      token: "SZcjpi",
      event: events.event_name,
      customer_properties: {
        $email: events.email,
        $first_name: events.first_name,
        $last_name: events.lastname,
        $phone_number: events.phone_number,
      },
      properties: {
        // item_name: events.sale_items[0].name,
        $value: events.net,
        orderId: events.orderId,
        status: events.status,
        items: events.sale_items,
      },
    }
    const options3 = {
      method: "post",
      url: `${process.env.KLAVIYO_URL}/api/track`,
      headers: {
        Accept: "text/html",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: JSON.stringify(travkItem),
    };
    axios(options3)
      .then((response) => response.data)
      .catch((error) => console.error("facing error", error));
  });
};

module.exports = { getNashvilleUser };
