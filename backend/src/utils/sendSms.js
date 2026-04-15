const axios = require('axios');

const sendSms = async (options) => {
    // Si les clés d'API ne sont pas configurées, on simule l'envoi
    if (!process.env.DEXATEL_API_KEY) {
        console.log('\n📱 [SIMULATION SMS] ----------------');
        console.log(`À: ${options.phone}`);
        console.log(`Message: ${options.message}`);
        console.log('--------------------------------------\n');
        return;
    }

    try {
        const url = 'https://api.dexatel.com/v1/messages';
        // Dexatel requires the "data" wrapper and "to" must be an array
        const payload = {
            data: {
                from: process.env.DEXATEL_SENDER_ID || "FinPay",
                to: [options.phone.toString()],
                text: options.message,
                channel: "SMS"
            }
        };

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Dexatel-Key': process.env.DEXATEL_API_KEY
        };

        const response = await axios.post(url, payload, { headers });
        console.log(`SMS envoyé via Dexatel, Message ID: ${response.data.data[0].message_id}`);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du SMS via Dexatel:', error.response ? error.response.data : error.message);
    }
};

module.exports = sendSms;
