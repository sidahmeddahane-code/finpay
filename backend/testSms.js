require('dotenv').config();
const sendSms = require('./src/utils/sendSms');

console.log("Testing Dexatel SMS...");
sendSms({
    phone: "+12345678901",  // Random dummy number to see if we get an auth or parameter error
    message: "Test message from backend API"
}).then(() => {
    console.log("Test finished.");
});
