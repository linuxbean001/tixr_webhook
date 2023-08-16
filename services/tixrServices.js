import { createHmac } from "crypto";
import { request as _request } from "https";
import axios, { get, post } from "axios";
import Klaviyo from "klaviyo-node";


//  GET TIXR ORDER DATA
async function getOrders(res, request) {
  const cpkArr = [
    // {
    //   cpk: "L7s0uUiCDii03flgekFr",
    //   pk: "lImlQZSRBRG5Nn5bDJBj",
    //   city: "Cincinnati",
    //   list_id: "XSNnkJ",
    //   klaviyo_pk: "pk_019d39a10598240f0350fc93c6e07acbcc",
    //   public_Key: "Suc7vS",
    // },
    {
      cpk: "QeMeljSat4aMs19bUtVe",
      pk: "M8FOzxbtIahEx8IIBVFn",
      city: "Nashville",
      list_id: "XtR3dQ",
      klaviyo_pk: "pk_24b1f27b5f87171695ae0795efa61c38a9",
      public_Key: "SZcjpi",
    },
    // {
    //   cpk: "HGaYBCI4XegP49F6NH0W",
    //   pk: "JMWv9XeEv0L3NnTSKpf4",
    //   city: "Columbus",
    //   list_id: "YfrE9p",
    //   klaviyo_pk: "pk_26e1f66120bffbd998d176a321f4e10d58",
    //   public_Key: "Ri9wyv",
    // },
    // {
    //   cpk: "L7s0uUiCDii03flgekFr",
    //   pk: "lImlQZSRBRG5Nn5bDJBj",
    //   city: "Columbus",
    //   list_id: "SnWt6X",
    //   klaviyo_pk: "pk_f4088e5c1c8127c6ea6e6669ff07fabb74",
    //   public_Key: "TWjXCg",
    // },
  ];

  // Get all group for a client using below API
  cpkArr.forEach(function (value) {
    get(`https://studio.tixr.com/v1/groups?cpk=${value.cpk}`, {
        headers: {
          Accept: "application/json",
        },
      })
      .then((data) => {
        data.data.forEach(function (value1) {
          const timestamp = Math.floor(Date.now());
          const cpk = value.cpk;
          const privateKey = value.pk;
          const pageNumbers = 10;
          const groupId = value1.id;
          // for (let pageNumbers =1; i<=75; i++ ){

          // }
          const dataToHash = `/v1/groups/${groupId}/orders?cpk=${cpk}&end_date=&page_number=${pageNumbers}&page_size=10&start_date=2023-01-1&status=&t=${timestamp}`;
          const algorithm = "sha256";
          const hash = createHmac(algorithm, privateKey)
            .update(dataToHash)
            .digest("hex");

          const options = {
            hostname: "studio.tixr.com",
            path: `/v1/groups/${groupId}/orders?cpk=${cpk}&end_date=&page_number=${pageNumbers}&page_size=10&start_date=2023-01-1&status=&t=${timestamp}&hash=${hash}`,
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          };

          const req = _request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => {
              data += chunk;
            });

            res.on("end", () => {
              let tixrData = JSON.parse(data);
              // return request(null, tixrData);
              var orders = {
                profiles: [],
              };
              var profiles2 = [];
              var profiles3 = [];
              tixrData.forEach(function (value2) {
                const dataToHash = `/v1/orders/${value2.orderId}/custom-form-submissions?cpk=${cpk}&t=${timestamp}`;
                const algorithm = "sha256";
                const hash = createHmac(algorithm, privateKey)
                  .update(dataToHash)
                  .digest("hex");
                get(
                    `https://studio.tixr.com/v1/orders/${value2.orderId}/custom-form-submissions?cpk=${cpk}&t=${timestamp}&hash=${hash}`,
                    {
                      headers: {
                        Accept: "application/json",
                      },
                    }
                  )
                  .then((data) => {
                    let phoneNumber;
                    data.data.forEach(function (values) {
                      phoneNumber = values.order_submissions[2].answers;
                      const normalizePhoneNumber = (phoneNumber) => {
                        const digitsOnly = phoneNumber.replace(/\D/g, "");

                        if (digitsOnly.length < 10) {
                          return null; // Invalid phone number
                        }

                        const countryCode =
                          digitsOnly.length === 11
                            ? "+" + digitsOnly.charAt(0)
                            : "+1";

                        const areaCode = digitsOnly.substr(
                          countryCode.length,
                          3
                        );
                        const phoneDigits = digitsOnly.substr(
                          countryCode.length + areaCode.length
                        );

                        const formattedPhoneNumber = `${countryCode} (${areaCode}) ${phoneDigits.slice(
                          0,
                          3
                        )}-${phoneDigits.slice(3)}`;

                        return formattedPhoneNumber;
                      };

                      let phoneNumber1 = "11"+ phoneNumber[0].answer;

                      const standardizedPhoneNumber1 =
                        normalizePhoneNumber(phoneNumber1);

                      // console.log(standardizedPhoneNumber1);
                      // console.log(phoneNumber[0].answer);
                     
                      orders.profiles.push({
                        email: value2.email,
                        first_name: value2.first_name,
                        last_name: value2.lastname,
                        phone_number: standardizedPhoneNumber1,
                        
                        sms_consent: value2.purchase_date,
                        $city:
                          value2 && value2.geo_info && value2.geo_info.city
                            ? value2.geo_info.city
                            : "",
                        latitude:
                          value2 && value2.geo_info && value2.geo_info.latitude
                            ? value2.geo_info.latitude
                            : "",
                        longitude:
                          value2 && value2.geo_info && value2.geo_info.longitude
                            ? value2.geo_info.longitude
                            : "",
                        country_code: value2.country_code,
                        purchase_date: value2.purchase_date,
                        orderId: value2.orderId,
                        event_name: value2.event_name,
                      });
                      
                      // return false;
                      profiles2.push({
                        token: value.public_Key,
                        event: value2.event_name,
                        customer_properties: {
                          $email: value2.email,
                          $first_name: value2.first_name,
                          $lastname: value2.lastname,
                          $phone_number: standardizedPhoneNumber1,
                        },
                          
                        properties: {
                          item_name: value2.sale_items[0].name,
                          $value: value2.net,
                          orderId: value2.orderId,
                          status: value2.status,
                          items: value2.sale_items,
                        },
                      });
                      console.log(profiles2)
                      profiles3.push({
                        email: value2.email,
                        phone_number: standardizedPhoneNumber1,
                        sms_consent: value2.purchase_date,
                      });
                      console.log(orders)
                      post(
                          `https://a.klaviyo.com/api/v2/list/${value.list_id}/members`,
                          orders,
                          {
                            headers: {
                              "Content-Type": "application/json",
                              "api-key": value.klaviyo_pk,
                            },
                          }
                        )
                        .then((data) => {
                          // console.log('data',data)
                        })
                        .catch((err) => {
                          // console.log(err)
                        });

                      //  for send subscribe email and sms

                      profiles3.forEach(async function (value3) {
                        // console.log(value3.email);
                        //  return false
                        // Promise.all()
                        const options3 = {
                          method: "post",
                          url: "https://a.klaviyo.com/api/v2/list/XtR3dQ/subscribe?api_key=pk_f4088e5c1c8127c6ea6e6669ff07fabb74",
                          headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                          },
                          // data: new URLSearchParams({
                          data: JSON.stringify({
                            profiles: [
                              { email: value3.email },
                              {
                                phone_number: value3.phone_number,
                                sms_consent: true,
                              },
                            ],
                          }),
                          // }).toString(),
                        };

                        await axios(options3)
                          .then((response) => response.data)
                          .catch((error) =>
                            console.error("facing error", error)
                          );
                      });

                      profiles2.forEach(function (value3) {
                        const options3 = {
                          method: "post",
                          url: "https://a.klaviyo.com/api/track",
                          headers: {
                            Accept: "text/html",
                            "Content-Type": "application/x-www-form-urlencoded",
                          },
                          data: new URLSearchParams({
                            data: JSON.stringify(value3),
                          }).toString(),
                        };

                        axios(options3)
                          .then((response) => console.log(response.data))
                          .catch((error) =>
                            console.error("facing error", error)
                          );
                      });
                    });
                  })
                  .catch((err) => {
                    // console.log(err)
                  });
              });
            });
          });
          req.on("error", (error) => {
            // console.error(error);
          });

          req.end();
        });
      })
      .catch((err) => {});
  });
}

// Separate List
export default {
  getOrders,
};
