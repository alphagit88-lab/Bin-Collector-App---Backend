const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// AWS SES configuration (commented out for revision):
/*
const requiredEnvironmentVariables = [
  'AWS_SES_SMTP_HOST',
  'AWS_SES_SMTP_USERNAME',
  'AWS_SES_SMTP_PASSWORD',
  'EMAIL_FROM',
];
*/

// Active SMTP configuration (Namecheap PrivateEmail or AWS SES fallback)
const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || process.env.AWS_SES_SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT || process.env.AWS_SES_SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USERNAME || process.env.SMTP_USER || process.env.AWS_SES_SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.AWS_SES_SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;

  const missing = [];
  if (!host) missing.push('SMTP_HOST (or AWS_SES_SMTP_HOST)');
  if (!user) missing.push('SMTP_USERNAME (or AWS_SES_SMTP_USERNAME)');
  if (!pass) missing.push('SMTP_PASSWORD (or AWS_SES_SMTP_PASSWORD)');
  if (!from) missing.push('EMAIL_FROM');

  if (missing.length > 0) {
    throw new Error(`Email configuration is incomplete: ${missing.join(', ')}`);
  }

  return { host, port, user, pass, from };
};

let transporter;

const getEmailLogoUrl = () => process.env.EMAIL_LOGO_URL
  || 'https://app.bindrop.ai/logo-bd.png';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getTransporter = () => {
  if (!transporter) {
    const { host, port, user, pass } = getSmtpConfig();
    const isSecure = port === 465 || process.env.SMTP_SECURE === 'true';

    // Original AWS SES transporter setup (commented out for revision):
    /*
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
    */

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
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
    logoUrl: getEmailLogoUrl(),
  },
  text: `Your BinDrop password reset code is ${otp}. It expires in ${expiresInMinutes} minutes. If you did not request this, you can ignore this email.`,
});

const crypto = require('crypto');

const generateTemporaryPassword = (length = 10) => {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const specials = '!@#$%*';
  const all = uppers + lowers + digits + specials;

  const pwd = [
    uppers[crypto.randomInt(uppers.length)],
    lowers[crypto.randomInt(lowers.length)],
    digits[crypto.randomInt(digits.length)],
    specials[crypto.randomInt(specials.length)],
  ];

  for (let i = pwd.length; i < length; i++) {
    pwd.push(all[crypto.randomInt(all.length)]);
  }

  return pwd.sort(() => crypto.randomInt(3) - 1).join('');
};

const sendCustomerCreatedBySupplierEmail = ({ to, name, temporaryPassword }) => sendTemplatedEmail({
  to,
  subject: 'Your BinDrop customer account is ready',
  templateName: 'customerCreatedBySupplier',
  variables: {
    name: name || 'Customer',
    temporaryPassword: temporaryPassword || '',
    webLoginUrl: `${process.env.FRONTEND_URL || 'https://app.bindrop.ai'}/login`,
    mobileAppUrl: process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile',
    year: new Date().getFullYear(),
    logoUrl: getEmailLogoUrl(),
  },
  text: `Hello ${name || 'Customer'},\n\nA BinDrop supplier has created a customer account for you so you can view and track your bin orders in one place.\n\nYour Temporary Password: ${temporaryPassword || ''}\n\nPlease change your password after logging in: This is a temporary password. Once you sign in at ${(process.env.FRONTEND_URL || 'https://app.bindrop.ai')}/login, go to your account settings to change it to your own personal password.\n\nDownload the mobile app: ${process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile'}`,
});

const sendCustomerCreatedByAdminEmail = ({ to, name, temporaryPassword }) => sendTemplatedEmail({
  to,
  subject: 'Your BinDrop customer account is ready',
  templateName: 'customerCreatedByAdmin',
  variables: {
    name: name || 'Customer',
    temporaryPassword: temporaryPassword || '',
    webLoginUrl: `${process.env.FRONTEND_URL || 'https://app.bindrop.ai'}/login`,
    mobileAppUrl: process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile',
    year: new Date().getFullYear(),
    logoUrl: getEmailLogoUrl(),
  },
  text: `Hello ${name || 'Customer'},\n\nYour BinDrop customer account has been created so you can view and track your bin orders in one place.\n\nYour Temporary Password: ${temporaryPassword || ''}\n\nPlease change your password after logging in: This is a temporary password set for your account. Once you sign in at ${(process.env.FRONTEND_URL || 'https://app.bindrop.ai')}/login, go to your account settings to change it to your own personal password.\n\nDownload the mobile app: ${process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile'}`,
});

module.exports = {
  renderTemplate,
  sendTemplatedEmail,
  sendPasswordResetOtpEmail,
  sendCustomerCreatedBySupplierEmail,
  sendCustomerCreatedByAdminEmail,
  generateTemporaryPassword,
};
