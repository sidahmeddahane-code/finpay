require('dotenv').config();
const axios = require('axios');

async function testSms() {
    try {
        const url = 'https://api.dexatel.com/v1/messages';
        const payload = {
            data: {
                from: process.env.DEXATEL_SENDER_ID,
                to: ["+12345678901"], // using a fake number
                text: "Test SMS",
                channel: "SMS"
            }
        };

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Dexatel-Key': process.env.DEXATEL_API_KEY
        };

        const response = await axios.post(url, payload, { headers });
        console.log("Success! Message sent.", response.data);
    } catch (error) {
        console.error("Dexatel Error:", JSON.stringify(error.response ? error.response.data : error.message, null, 2));
    }
}

testSms();
