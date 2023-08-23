const fetch = require("node-fetch");
const crypto = require("crypto");

const getCincinnatiUser = async (req, res) => {
  try {
    const timestamp = Math.floor(Date.now());
    const queryParams = new URLSearchParams({
      cpk: process.env.CINCINNATI_CPK_KEY,
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

    const groupResponse = await fetch(
      `${process.env.TIXR_URL}/v1/groups?cpk=${process.env.CINCINNATI_CPK_KEY}`
    );
    const groupData = await groupResponse.json();

    const valuePromises = groupData.map(async (element) => {
      const dataToHash = `/v1/groups/${element.id
        }/orders?${queryParams.toString()}`;
      const algorithm = "sha256";
      const hash = crypto
        .createHmac(algorithm, process.env.CINCINNATI_PRIVATE_KEY)
        .update(dataToHash)
        .digest("hex");

      const requestUrl = `${process.env.TIXR_URL}${dataToHash}&hash=${hash}`;
      const options = {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      };

      const reqPromise = new Promise((resolve, reject) => {
        const req = https.request(requestUrl, options, (response) => {
          let responseData = '';

          response.on('data', (chunk) => {
            responseData += chunk;
          });

          response.on('end', () => {
            resolve(responseData);
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.end();
      });

      try {
        const orderResponseData = await reqPromise;
        // Process orderResponseData
      } catch (error) {
        console.error('Error during GET request:', error);
      }
      const orderData = orderResponse.data;
      orderData.map(async (details) => {
        const dataToHash = `/v1/orders/${details.orderId}/custom-form-submissions?cpk=${process.env.CINCINNATI_CPK_KEY}&t=${timestamp}`;
        const algorithm = "sha256";
        const hash = crypto
          .createHmac(algorithm, process.env.CINCINNATI_PRIVATE_KEY)
          .update(dataToHash)
          .digest("hex");

        const requestUrl = `${process.env.TIXR_URL}/v1/orders/${details.orderId}/custom-form-submissions?cpk=${process.env.CINCINNATI_CPK_KEY}&t=${timestamp}&hash=${hash}`;

        const options = {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        };

        const reqPromise = new Promise((resolve, reject) => {
          const req = https.request(requestUrl, options, (response) => {
            let responseData = '';

            response.on('data', (chunk) => {
              responseData += chunk;
            });

            response.on('end', () => {
              resolve(responseData);
            });
          });

          req.on('error', (error) => {
            reject(error);
          });

          req.end();
        });

        try {
          const orderResponseData = await reqPromise;
          const data = JSON.parse(orderResponseData);

          data.forEach(function (values) {
            values.ticket_submissions.length == 0
              ? values.order_submissions[2].answers.forEach((items) => {
                mobNumber = items.answer;
                const normalizePhoneNumber = (mobNumber) => {
                  const digitsOnly = mobNumber.replace(/\D/g, "");

                  if (digitsOnly.length < 10) {
                    return null; // Invalid phone number
                  }

                  const countryCode =
                    digitsOnly.length === 11
                      ? "+" + digitsOnly.charAt(0)
                      : "+1";

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
                const standardizedPhoneNumber1 =
                  normalizePhoneNumber(phoneNumber);
                attendeeInfo.profiles.push({
                  first_name: details.first_name,
                  last_name: details.lastname,
                  email: details.email,
                  phone_number: standardizedPhoneNumber1,
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
                postUserInfo(attendeeInfo, res);
                // Handle logic for ticket_submissions length 0
              })
              : values.ticket_submissions[2].answers.forEach((items) => {
                // Handle logic for ticket_submissions length > 0
                mobNumber = items.answer;
                const normalizePhoneNumber = (mobNumber) => {
                  const digitsOnly = mobNumber.replace(/\D/g, "");
                  if (digitsOnly.length < 10) {
                    return null; // Invalid phone number
                  }
                  const countryCode =
                    digitsOnly.length === 11
                      ? "+" + digitsOnly.charAt(0)
                      : "+1";
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
                const standardizedPhoneNumber1 =
                  normalizePhoneNumber(phoneNumber);
                attendeeInfo.profiles.push({
                  first_name: details.first_name,
                  last_name: details.lastname,
                  email: details.email,
                  phone_number: standardizedPhoneNumber1,
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
                postUserInfo(attendeeInfo, res);

              });
          });

          // Further processing...
        } catch (error) {
          console.error('Error during GET request:', error);
        }
      });
      trackKlaviyo(orderData)
      res.status(200).json({
        result: orderData,
        success: true,
        message: `Total Record ${orderData.length}`
      });
      // });
    });
    await Promise.all(valuePromises);
  } catch (err) {
    res.status(500).json({
      error: err.message || JSON.stringify(err), success: false
    })
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const subscribeEvent = async (contacts) => {
  try {
    const url = `${process.env.KLAVIYO_URL}/v2/list/${process.env.CINCINNATI_List_Id}/subscribe?api_key=${process.env.CINCINNATI_Klaviyo_API_Key}`;
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
    console.error("Error:", typeof error);
    throw error;
  }
};

// / Post UserInformation Klaviyo
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000; // 1 second

const postUserInfo = async (req, res) => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const reqPromise = new Promise((resolve, reject) => {
        const request = https.request(
          `${process.env.KLAVIYO_URL}/v2/list/${process.env.CINCINNATI_List_Id}/members?api_key=${process.env.CINCINNATI_Klaviyo_API_Key}`,
          options,
          (response) => {
            let responseData = '';

            response.on('data', (chunk) => {
              responseData += chunk;
            });

            response.on('end', () => {
              resolve(responseData);
            });
          }
        );

        request.on('error', (error) => {
          reject(error);
        });

        request.write(JSON.stringify(req));
        request.end();
      });

      const data = await reqPromise;
      console.log('post data', data);

      const subscribeResult = await subscribeEvent(req);
      break;
    } catch (error) {
      console.error('postApi', error);

      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] * 1000 || INITIAL_BACKOFF_MS;
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        retries++;
      } else {
        // Handle other errors if needed
        break;
      }
    }
  }
};

const trackKlaviyo = (res) => {
  res.forEach((events) => {
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

    let options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request('https://a.klaviyo.com/api/track', options, (response) => {
      let responseData = '';

      response.on('data', (chunk) => {
        responseData += chunk;
      });

      response.on('end', () => {
        console.log(JSON.stringify(responseData));
      });
    });

    req.on('error', (error) => {
      console.log(error);
    });

    req.write(data);
    req.end();
  });
};

module.exports = { getCincinnatiUser };
