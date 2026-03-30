const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Si les identifiants SMTP ne sont pas encore configurés, on simule l'envoi pour éviter un crash local
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.log('\n[SIMULATION EMAIL] -------------------');
        console.log(`À: ${options.email}`);
        console.log(`Sujet: ${options.subject}`);
        console.log(`Message: ${options.message || 'HTML Content'}`);
        console.log('--------------------------------------\n');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email envoyé : ${info.messageId}`);
    } catch (error) {
        console.error('Erreur lors de l\'envois d\'email SMTP:', error);
    }
};

module.exports = sendEmail;
