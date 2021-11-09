let nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: '587',
  auth: {
    user: process.env.EMAIL_ADMIN,
    pass: process.env.PASSWORD_ADMIN,
  },
  secureConnection: false,
  tls: { ciphers: 'SSLv3' },
});

module.exports = transporter;
