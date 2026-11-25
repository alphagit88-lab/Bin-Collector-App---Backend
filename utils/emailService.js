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

    console.log('SMTP host: ', host);

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
  content = content.replace(/{{{\s*([a-zA-Z0-9_]+)\s*}}}/g, (_, key) => String(variables[key] ?? ''));
  content = content.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => escapeHtml(variables[key]));

  let layout = fs.readFileSync(layoutPath, 'utf8').replace('{{content}}', content);
  layout = layout.replace(/{{{\s*([a-zA-Z0-9_]+)\s*}}}/g, (_, key) => String(variables[key] ?? ''));
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

const formatRoleTitle = (role = '') => {
  switch (String(role).toLowerCase()) {
    case 'admin':
      return 'Administrator';
    case 'supplier':
      return 'Supplier';
    case 'driver':
      return 'Driver';
    case 'customer':
    default:
      return 'Customer';
  }
};

const getAdminCreatedDescription = (role = '') => {
  switch (String(role).toLowerCase()) {
    case 'supplier':
      return 'Your BinDrop supplier account has been created so you can manage your fleet, bins, and customer orders.';
    case 'driver':
      return 'Your BinDrop driver account has been created so you can view and fulfill your assigned delivery jobs.';
    case 'admin':
      return 'Your BinDrop administrator account has been created so you can manage platform operations.';
    case 'customer':
    default:
      return 'Your BinDrop customer account has been created so you can view and track your bin orders in one place.';
  }
};

const getSupplierCreatedDescription = (role = '') => {
  switch (String(role).toLowerCase()) {
    case 'driver':
      return 'A BinDrop supplier has created a driver account for you so you can view and fulfill your assigned delivery jobs.';
    case 'customer':
    default:
      return 'A BinDrop supplier has created a customer account for you so you can view and track your bin orders in one place.';
  }
};

const sendUserCreatedByAdminEmail = ({ to, name, role = 'customer', temporaryPassword, description }) => {
  const roleTitle = formatRoleTitle(role);
  const resolvedDescription = description || getAdminCreatedDescription(role);

  return sendTemplatedEmail({
    to,
    subject: `Your BinDrop ${roleTitle} account is ready`,
    templateName: 'userCreatedByAdmin',
    variables: {
      name: name || roleTitle,
      role: roleTitle,
      roleTitle,
      description: resolvedDescription,
      temporaryPassword: temporaryPassword || '',
      webLoginUrl: `${process.env.FRONTEND_URL || 'https://app.bindrop.ai'}/login`,
      mobileAppUrl: process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile',
      year: new Date().getFullYear(),
      logoUrl: getEmailLogoUrl(),
    },
    text: `Hello ${name || roleTitle},\n\n${resolvedDescription}\n\nYour Temporary Password: ${temporaryPassword || ''}\n\nPlease change your password after logging in: This is a temporary password set for your account. Once you sign in at ${(process.env.FRONTEND_URL || 'https://app.bindrop.ai')}/login, go to your account settings to change it to your own personal password.\n\nDownload the mobile app: ${process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile'}`,
  });
};

const sendUserCreatedBySupplierEmail = ({ to, name, role = 'customer', temporaryPassword, description, supplierName, acceptUrl }) => {
  const roleTitle = formatRoleTitle(role);
  const resolvedDescription = description || (supplierName
    ? `${supplierName} has created a ${roleTitle.toLowerCase()} account for you on BinDrop so you can view and track your bin orders.`
    : getSupplierCreatedDescription(role));

  let acceptSection = '';
  if (acceptUrl) {
    acceptSection = `
<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:24px auto 14px;text-align:center;">
  <tr>
    <td style="border-radius:6px;background:#10b981;text-align:center;">
      <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:6px;line-height:1.4;">Accept Invitation</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 20px;text-align:center;color:#6b7280;font-size:13px;">
  Click Accept above to activate your account with ${escapeHtml(supplierName || 'your supplier')} (no login required).
</p>`;
  }

  return sendTemplatedEmail({
    to,
    subject: supplierName ? `${supplierName} invited you to BinDrop - Account Ready` : `Your BinDrop ${roleTitle} account is ready`,
    templateName: 'userCreatedBySupplier',
    variables: {
      name: name || roleTitle,
      role: roleTitle,
      roleTitle,
      supplierName: supplierName || 'Your Supplier',
      acceptSection,
      description: resolvedDescription,
      temporaryPassword: temporaryPassword || '',
      webLoginUrl: `${process.env.FRONTEND_URL || 'https://app.bindrop.ai'}/login`,
      mobileAppUrl: process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile',
      year: new Date().getFullYear(),
      logoUrl: getEmailLogoUrl(),
    },
    text: `Hello ${name || roleTitle},\n\n${resolvedDescription}\n\n${acceptUrl ? `Accept your invitation to activate: ${acceptUrl}\n\n` : ''}Your Temporary Password: ${temporaryPassword || ''}\n\nPlease change your password after logging in: This is a temporary password generated for your account. Once you sign in at ${(process.env.FRONTEND_URL || 'https://app.bindrop.ai')}/login, go to your account settings to change it to your own personal password.\n\nDownload the mobile app: ${process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile'}`,
  });
};

const sendCustomerInvitationEmail = ({ to, name, supplierName, acceptUrl }) => {
  return sendTemplatedEmail({
    to,
    subject: `${supplierName || 'A supplier'} invited you to connect on BinDrop`,
    templateName: 'customerInvitation',
    variables: {
      name: name || 'Customer',
      supplierName: supplierName || 'A BinDrop Supplier',
      acceptUrl: acceptUrl || '',
      webLoginUrl: `${process.env.FRONTEND_URL || 'https://app.bindrop.ai'}/login`,
      mobileAppUrl: process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.binrental.mobile',
      year: new Date().getFullYear(),
      logoUrl: getEmailLogoUrl(),
    },
    text: `Hello ${name || 'Customer'},\n\n${supplierName || 'A supplier'} has added you as a customer to their account on BinDrop.\n\nTo activate your account under this supplier and allow them to manage bin rentals for you, please accept the invitation:\n${acceptUrl}\n\n(No login required to accept)\n\nSign in at ${(process.env.FRONTEND_URL || 'https://app.bindrop.ai')}/login`,
  });
};

const sendCustomerStatusEmail = ({ to, name, supplierName, isActive }) => {
  const action = isActive ? 'activated' : 'deactivated';
  const statusLabel = isActive ? 'Active' : 'Inactive';
  const statusDescription = isActive
    ? `Your account is now active under ${supplierName}.`
    : `Your account has been deactivated under ${supplierName}. Contact them if you believe this is a mistake.`;

  return sendTemplatedEmail({
    to,
    subject: `Your BinDrop account has been ${action} by ${supplierName}`,
    templateName: 'customerStatusChanged',
    variables: {
      name: name || 'Customer',
      supplierName,
      action,
      statusLabel,
      statusDescription,
      badgeBg: isActive ? '#f0fdf4' : '#fff1f2',
      badgeBorder: isActive ? '#bbf7d0' : '#fecdd3',
      badgeAccent: isActive ? '#059669' : '#e11d48',
      webLoginUrl: `${process.env.FRONTEND_URL || 'https://app.bindrop.ai'}/login`,
      year: new Date().getFullYear(),
      logoUrl: getEmailLogoUrl(),
    },
    text: `Hello ${name || 'Customer'},\n\nYour customer account with ${supplierName} on BinDrop has been ${action}.\n\nStatus: ${statusLabel}\n${statusDescription}\n\nSign in at ${process.env.FRONTEND_URL || 'https://app.bindrop.ai'}/login`,
  });
};

module.exports = {
  renderTemplate,
  sendTemplatedEmail,
  sendPasswordResetOtpEmail,
  sendUserCreatedByAdminEmail,
  sendUserCreatedBySupplierEmail,
  sendCustomerInvitationEmail,
  sendCustomerStatusEmail,
  generateTemporaryPassword,
  formatRoleTitle,
  getAdminCreatedDescription,
  getSupplierCreatedDescription,
};
