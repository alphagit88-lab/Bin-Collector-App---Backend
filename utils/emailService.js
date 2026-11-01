const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const requiredEnvironmentVariables = [
  'AWS_SES_SMTP_HOST',
  'AWS_SES_SMTP_USERNAME',
  'AWS_SES_SMTP_PASSWORD',
  'EMAIL_FROM',
];

let transporter;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getTransporter = () => {
  const missing = requiredEnvironmentVariables.filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Email configuration is incomplete: ${missing.join(', ')}`);
  }

  if (!transporter) {
    const port = Number.parseInt(process.env.AWS_SES_SMTP_PORT || '587', 10);
    transporter = nodemailer.createTransport({
      host: process.env.AWS_SES_SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.AWS_SES_SMTP_USERNAME,
        pass: process.env.AWS_SES_SMTP_PASSWORD,
      },
    });
  }

  return transporter;
};

const renderTemplate = (templateName, variables = {}) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
    throw new Error('Invalid email template name');
  }

  const templatePath = path.join(__dirname, '..', 'templates', 'email', `${templateName}.html`);
  const layoutPath = path.join(__dirname, '..', 'templates', 'email', 'layout.html');
  let content = fs.readFileSync(templatePath, 'utf8');
  content = content.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => escapeHtml(variables[key]));

  let layout = fs.readFileSync(layoutPath, 'utf8').replace('{{content}}', content);
  layout = layout.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => escapeHtml(variables[key]));
  return layout;
};

const sendTemplatedEmail = async ({ to, subject, templateName, variables, text, attachments = [] }) => {
  const html = renderTemplate(templateName, variables);
  return getTransporter().sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'BinDrop'}" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
    text,
    attachments,
  });
};

const sendPasswordResetOtpEmail = ({ to, name, otp, expiresInMinutes }) => sendTemplatedEmail({
  to,
  subject: 'Your BinDrop password reset code',
  templateName: 'passwordResetOtp',
  variables: {
    name: name || 'BinDrop customer',
    otp,
    expiresInMinutes,
    year: new Date().getFullYear(),
  },
  text: `Your BinDrop password reset code is ${otp}. It expires in ${expiresInMinutes} minutes. If you did not request this, you can ignore this email.`,
  attachments: [{
    filename: 'logo-bd.png',
    path: path.join(__dirname, '..', '..', 'logo-bd.png'),
    cid: 'bindrop-logo',
  }],
});

const sendCustomerCreatedBySupplierEmail = ({ to, name }) => sendTemplatedEmail({
  to,
  subject: 'Your BinDrop customer account is ready',
  templateName: 'customerCreatedBySupplier',
  variables: {
    name: name || 'Customer',
    webLoginUrl: `${process.env.FRONTEND_URL || 'https://app.bindrop.ai'}/login`,
    mobileAppUrl: process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile',
    year: new Date().getFullYear(),
  },
  text: `A BinDrop supplier created a customer account for you. Set your password using Forgot Password, then sign in at ${(process.env.FRONTEND_URL || 'https://app.bindrop.ai')}/login. Download the mobile app: ${process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile'}`,
  attachments: [{
    filename: 'logo-bd.png',
    path: path.join(__dirname, '..', '..', 'logo-bd.png'),
    cid: 'bindrop-logo',
  }],
});

module.exports = {
  renderTemplate,
  sendTemplatedEmail,
  sendPasswordResetOtpEmail,
  sendCustomerCreatedBySupplierEmail,
};
