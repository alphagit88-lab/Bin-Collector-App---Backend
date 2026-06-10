const ServiceRequest = require('../models/ServiceRequest');

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const REQUEST_ID_LENGTH = 5;
const MAX_ATTEMPTS = 20;

function randomRequestId() {
  let id = '';
  for (let i = 0; i < REQUEST_ID_LENGTH; i++) {
    id += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return id;
}

async function generateRequestId() {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const requestId = randomRequestId();
    const exists = await ServiceRequest.requestIdExists(requestId);
    if (!exists) {
      return requestId;
    }
  }

  throw new Error('Failed to generate unique request ID');
}

module.exports = { generateRequestId };
