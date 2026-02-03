const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notifications to one or multiple tokens
 * @param {string|string[]} pushTokens - Single token or array of tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
const sendPushNotifications = async (pushTokens, title, body, data = {}) => {
    const tokens = Array.isArray(pushTokens) ? pushTokens : [pushTokens];
    const messages = [];

    for (const pushToken of tokens) {
        if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }

        messages.push({
            to: pushToken,
            sound: 'default',
            title: title,
            body: body,
            data: data,
        });
    }

    // Batch notifications to reduce number of requests
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log('Push notification ticket chunk:', ticketChunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error('Error sending push notification chunk:', error);
        }
    }

    return tickets;
};

module.exports = { sendPushNotifications };
