const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function test1() {
  try {
      const { data } = await axios.post('https://api.dexatel.com/v1/messages', {
          data: {
              channel: "SMS",
              to: ["+12345678901"],
              from: "FinPay",
              text: "test array"
          }
      }, {
          headers: { 'X-Dexatel-Key': process.env.DEXATEL_API_KEY, 'Content-Type': 'application/json' }
      });
      console.log("Success test 1", data);
  } catch(e) {
      console.error("Test 1 error", e.response?.data || e.message);
  }
}

async function test2() {
  try {
      const { data } = await axios.post('https://api.dexatel.com/v1/messages', {
          data: {
              from: "FinPay",
              to: ["+12345678901"],
              text: "test simple data array"
          }
      }, {
          headers: { 'X-Dexatel-Key': process.env.DEXATEL_API_KEY, 'Content-Type': 'application/json' }
      });
      console.log("Success test 2", data);
  } catch(e) {
      console.error("Test 2 error", e.response?.data || e.message);
  }
}

async function test3() {
    try {
        const { data } = await axios.post('https://api.dexatel.com/v1/messages', {
            channel: "SMS",
            from: "FinPay",
            to: ["+12345678901"],
            text: "test flat array"
        }, {
            headers: { 'X-Dexatel-Key': process.env.DEXATEL_API_KEY, 'Content-Type': 'application/json' }
        });
        console.log("Success test 3", data);
    } catch(e) {
        console.error("Test 3 error", e.response?.data || e.message);
    }
}

test1().then(test2).then(test3);
