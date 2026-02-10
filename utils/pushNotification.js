const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with the service account file provided by the user
try {
    const serviceAccount = require(path.join(__dirname, '..', 'binrental-firebase-adminsdk-fbsvc-8deb8d0cae.json'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
}

/**
 * Send push notifications via Firebase Cloud Messaging (FCM)
 * @param {string|string[]} pushTokens - Single token or array of tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
const sendPushNotifications = async (pushTokens, title, body, data = {}) => {
    const tokens = Array.isArray(pushTokens) ? pushTokens : [pushTokens];

    // Filter out any empty tokens
    const validTokens = tokens.filter(t => t && typeof t === 'string' && t.trim() !== '');

    if (validTokens.length === 0) {
        console.log('No valid FCM tokens provided, skipping push notification');
        return [];
    }

    // Convert all data values to strings (FCM requirement for data payload)
    const stringData = {};
    Object.keys(data).forEach(key => {
        stringData[key] = String(data[key]);
    });

    const message = {
        notification: {
            title,
            body,
        },
        data: stringData,
        tokens: validTokens,
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} notifications; ${response.failureCount} failed.`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Failure sending to token ${validTokens[idx]}:`, resp.error.message);
                }
            });
        }

        return response.responses;
    } catch (error) {
        console.error('Error sending multicase FCM message:', error);
        throw error;
    }
};

module.exports = { sendPushNotifications };
