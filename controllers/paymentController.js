const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const ServiceRequest = require('../models/ServiceRequest');
const Transaction = require('../models/Transaction');
const SupplierWallet = require('../models/SupplierWallet');
const SystemSetting = require('../models/SystemSetting');
const Bill = require('../models/Bill');

const processSuccessfulPayment = async ({ requestId, paymentIntent, eventId, app }) => {
  const request = await ServiceRequest.findById(requestId);
  if (!request) {
    return { received: true };
  }

  // Idempotency: if already paid, do nothing
  if (request.payment_status === 'paid') {
    return { received: true };
  }

  if (!request.supplier_id) {
    await ServiceRequest.update(requestId, { payment_status: 'paid' });
    return { received: true };
  }

  const totalAmount = parseFloat(request.total_price || request.estimated_price || 0);
  const commissionSetting = await SystemSetting.findByKey('platform_commission_percentage');
  const commissionPercentage = commissionSetting ? (parseFloat(commissionSetting.value) / 100) : 0.15;
  const commissionAmount = totalAmount * commissionPercentage;
  const netAmount = totalAmount - commissionAmount;

  const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
  const transaction = await Transaction.create({
    transaction_id: transactionId,
    customer_id: request.customer_id,
    supplier_id: request.supplier_id,
    booking_id: request.request_id,
    amount: totalAmount,
    commission_amount: commissionAmount,
    net_amount: netAmount,
    payment_method: 'stripe',
    payment_status: 'completed',
    transaction_type: 'payment',
    description: `Stripe payment for ${request.request_id}`,
    metadata: {
      stripe_payment_intent_id: paymentIntent.id,
      stripe_event_id: eventId || null,
    },
  });

  // Move to confirmed only after payment success
  const nextUpdates = { payment_status: 'paid' };
  if (request.status === 'awaiting_payment') {
    nextUpdates.status = 'confirmed';
  }
  await ServiceRequest.update(requestId, nextUpdates);

  // Update associated bill
  const bill = await Bill.findByServiceRequestId(requestId);
  if (bill) {
    await Bill.update(bill.id, { payment_status: 'paid', paid_at: new Date() });
  }

  // Credit supplier wallet
  const wallet = await SupplierWallet.getOrCreate(request.supplier_id);
  await SupplierWallet.addCredit(
    wallet.id,
    netAmount,
    transaction.id,
    requestId,
    `Payment for ${request.request_id}`
  );

  // Notify customer and supplier
  const io = app?.get('io');
  if (io) {
    const updatedRequest = await ServiceRequest.findById(requestId);
    io.to(`user_${request.customer_id}`).emit('status_update', {
      booking_id: requestId,
      status: updatedRequest?.status || 'confirmed',
      message: `Payment received for booking #${request.request_id.slice(-5).toUpperCase()}`,
      request: updatedRequest,
    });

    io.to(`supplier_${request.supplier_id}`).emit('payment_received', {
      request: updatedRequest,
      transaction,
      amount: netAmount,
    });
  }

  return { received: true };
};

const createPaymentIntent = async (req, res) => {
  try {
    const { requestId } = req.body;
    
    // Fetch the request to get the amount
    const request = await ServiceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }

    if ((request.payment_method || 'online') !== 'online') {
      return res.status(400).json({
        success: false,
        message: 'This request is not an online payment order',
      });
    }

    if (!request.supplier_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment is not available until a supplier accepts this order',
      });
    }

    if (request.status !== 'awaiting_payment') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not required in the current status',
      });
    }

    if (request.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This order is already paid',
      });
    }

    const currency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
    const amount = Math.round(parseFloat(request.estimated_price || 0) * 100); // Stripe expects smallest currency unit
    
    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment amount',
        });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { requestId: String(request.id), customerId: String(req.user.id), supplierId: String(request.supplier_id) },
      payment_method_types: ['card'], // Add 'google_pay' if needed, but 'card' usually covers mobile pay in Stripe RN
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      },
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing payment',
      error: error.message,
    });
  }
};

const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).send('Webhook not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const requestIdRaw = paymentIntent?.metadata?.requestId;
      const requestId = requestIdRaw ? parseInt(requestIdRaw, 10) : NaN;

      if (!requestIdRaw || isNaN(requestId)) {
        console.error('payment_intent.succeeded missing requestId metadata');
        return res.json({ received: true });
      }

      await processSuccessfulPayment({
        requestId,
        paymentIntent,
        eventId: event.id,
        app: req.app,
      });
    }

    // For failed/canceled payments we keep payment_status as 'pending'
    return res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handling error:', error);
    return res.status(500).send('Webhook handler failed');
  }
};

const confirmPaymentSuccess = async (req, res) => {
  try {
    const { requestId, paymentIntentId } = req.body;

    if (!requestId || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'requestId and paymentIntentId are required',
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not completed yet',
      });
    }

    await processSuccessfulPayment({
      requestId: parseInt(requestId, 10),
      paymentIntent,
      eventId: null,
      app: req.app,
    });

    return res.json({ success: true, message: 'Payment confirmed' });
  } catch (error) {
    console.error('Confirm payment success error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
    });
  }
};

module.exports = {
  createPaymentIntent,
  stripeWebhook,
  confirmPaymentSuccess,
};
