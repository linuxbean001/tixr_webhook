const fetch = require("node-fetch");
const crypto = require("crypto");
const axios = require("axios");

const getColumbusUser = (req, res) => {
  const timestamp = Math.floor(Date.now());
  const queryParams = new URLSearchParams({
    cpk: process.env.COLUMBUS_CPK_KEY,
    end_date: req.query.end_date,
    page_number: req.query.page,
    page_size: req.query.page_size || 1,
    start_date: req.query.start_date,
    status: "",
    t: timestamp,
  });
  const attendeeInfo = {
    profiles: [],
  };
  fetch(
    `${process.env.TIXR_URL}/v1/groups?cpk=${process.env.COLUMBUS_CPK_KEY}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`);
      }
      return response.json();
    })
    .then((text) => {
      const promises = text.map(async (element) => {
        const dataToHash = `/v1/groups/${element.id
          }/orders?${queryParams.toString()}`;
        const algorithm = "sha256";
        const hash = crypto
          .createHmac(algorithm, process.env.COLUMBUS_PRIVATE_KEY)
          .update(dataToHash)
          .digest("hex");
        return axios.get(`${process.env.TIXR_URL}${dataToHash}&hash=${hash}`, {
          headers: {
            Accept: "application/json",
          },
        });
      });
      return Promise.all(promises);
    })
    .then((responses) => {
      const responseData = responses.map((response) => response.data);
      responseData.map((userDetails) => {
        userDetails.map((value) => {
          const dataToHash = `/v1/orders/${value.orderId}/custom-form-submissions?cpk=${process.env.COLUMBUS_CPK_KEY}&t=${timestamp}`;
          const algorithm = "sha256";
          const hash = crypto
            .createHmac(algorithm, process.env.COLUMBUS_PRIVATE_KEY)
            .update(dataToHash)
            .digest("hex");
          axios
            .get(
              `${process.env.TIXR_URL}/v1/orders/${value.orderId}/custom-form-submissions?cpk=${process.env.COLUMBUS_CPK_KEY}&t=${timestamp}&hash=${hash}`
            )
            .then((res) => {
              res.data.map((details) => {
                attendeeInfo.profiles.push({
                  first_name: value.first_name,
                  last_name: value.lastname,
                  email: value.email,
                  phone_number:
                    "+1" + details.order_submissions[2].answers[0].answer,
                  $city:
                    value && value.geo_info && value.geo_info.city
                      ? value.geo_info.city
                      : "",
                  latitude:
                    value && value.geo_info && value.geo_info.latitude
                      ? value.geo_info.latitude
                      : "",
                  longitude:
                    value && value.geo_info && value.geo_info.longitude
                      ? value.geo_info.longitude
                      : "",
                  country_code: value.country_code,
                  purchase_date: value.purchase_date,
                  orderId: value.orderId,
                  event_name: value.event_name,
                });
                postUserInfo(attendeeInfo);
              });
            });
        });
      });
      res.status(200).json({
        result: responseData.length,
        success: true,
        message: "Attendee Details Post Successfully",
      });
    })
    .catch((err) => {
      console.error("Error:", err);
      res.status(500).json({ error: "An error occurred while fetching data" });
    });
};

//Post UserInformation Klaviyo
const postUserInfo = async (req, res) => {
  subscribeEvent(req);
  try {
    await axios
      .post(
        `${process.env.KLAVIYO_URL}/v2/list/YfrE9p/members?api_key=pk_26e1f66120bffbd998d176a321f4e10d58`,
        req
      )
      .then((data) => {
        // console.log(data)
      });

    return { success: true, message: "Attendee Details Post wait" }; // Return the response data
  } catch (error) {
  }
};

// Subscribe the user event
const subscribeEvent = async (contacts) => {
  // trackKlaviyo(contacts.profiles);
  contacts.profiles.map((subscribe_user) => {
    const url = `${process.env.KLAVIYO_URL}/api/v2/list/YfrE9p/subscribe?api_key=pk_26e1f66120bffbd998d176a321f4e10d58`;
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
      .then((json) => json)
      .catch((err) => console.error("error:" + err));
  });
};

const trackKlaviyo = (res) => {
  res.map((events) => {
    const trackItem = {
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
      data: JSON.stringify(trackItem),
    };
    axios(options3)
      .then((response) => response.data)
      .catch((error) => console.error("facing error", error));
  });
};

module.exports = { getColumbusUser };
