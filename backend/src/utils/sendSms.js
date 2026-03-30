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
        const message = await client.messages.create({
            body: options.message,
            from: process.env.TWILIO_PHONE_NUMBER, // Votre numéro Twilio
            to: options.phone
        });
        console.log(`SMS envoyé : ${message.sid}`);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du SMS via Twilio:', error);
    }
};

module.exports = sendSms;
