const twilio = require('twilio');

const sendSms = async (options) => {
    // Si les clés d'API ne sont pas configurées, on simule l'envoi pour éviter les crash locaux
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log('\n📱 [SIMULATION SMS] ----------------');
        console.log(`À: ${options.phone}`);
        console.log(`Message: ${options.message}`);
        console.log('--------------------------------------\n');
        return;
    }

    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        const isMessagingService = process.env.TWILIO_PHONE_NUMBER.startsWith('MG');
        const messagePayload = {
            body: options.message,
            to: options.phone
        };

        if (isMessagingService) {
            messagePayload.messagingServiceSid = process.env.TWILIO_PHONE_NUMBER;
        } else {
            messagePayload.from = process.env.TWILIO_PHONE_NUMBER;
        }

        const message = await client.messages.create(messagePayload);
        console.log(`SMS envoyé : ${message.sid}`);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du SMS via Twilio:', error);
    }
};

module.exports = sendSms;
