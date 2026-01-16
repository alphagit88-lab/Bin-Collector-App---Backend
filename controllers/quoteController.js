const Quote = require('../models/Quote');
const ServiceRequest = require('../models/ServiceRequest');
const Transaction = require('../models/Transaction');
const SupplierWallet = require('../models/SupplierWallet');
const SystemSetting = require('../models/SystemSetting');
const PhysicalBin = require('../models/PhysicalBin');

// Submit quote (supplier)
const submitQuote = async (req, res) => {
  try {
    const { service_request_id, total_price, additional_charges, notes } = req.body;
    const supplierId = req.user.id;

    const request = await ServiceRequest.findById(service_request_id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }

    // Allow supplier to quote if they accepted the request or if no supplier is assigned yet
    if (request.supplier_id && request.supplier_id !== supplierId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this request',
      });
    }

    // If no supplier assigned, assign this supplier
    if (!request.supplier_id) {
      await ServiceRequest.update(service_request_id, {
        supplier_id: supplierId,
        status: 'quoted',
      });
    }

    const quoteId = `QUOTE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;

    const quote = await Quote.create({
      quote_id: quoteId,
      service_request_id,
      supplier_id: supplierId,
      total_price,
      additional_charges: additional_charges || 0,
      notes,
    });

    // Update request status
    await ServiceRequest.update(service_request_id, { status: 'quoted' });

    // Notify customer
    const io = req.app.get('io');
    if (io) {
      io.to(`customer_${request.customer_id}`).emit('new_quote', {
        quote,
        request,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Quote submitted successfully',
      data: { quote },
    });
  } catch (error) {
    console.error('Submit quote error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quote',
      error: error.message,
    });
  }
};

// Get quotes for a service request
const getQuotesByRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const request = await ServiceRequest.findByRequestId(request_id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }

    const quotes = await Quote.findByServiceRequest(request.id);

    res.json({
      success: true,
      data: { quotes },
    });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quotes',
      error: error.message,
    });
  }
};

// Accept quote (customer)
const acceptQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const quote = await Quote.findById(id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found',
      });
    }

    const request = await ServiceRequest.findById(quote.service_request_id);
    if (request.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Accept quote
    await Quote.accept(id);

    // Update request status
    await ServiceRequest.update(quote.service_request_id, { status: 'accepted' });

    // Reject other quotes for this request
    const allQuotes = await Quote.findByServiceRequest(quote.service_request_id);
    for (const q of allQuotes) {
      if (q.id !== quote.id && q.status === 'pending') {
        await Quote.reject(q.id);
      }
    }

    // Process payment automatically
    const commissionSetting = await SystemSetting.findByKey('platform_commission_percentage');
    const commissionPercentage = commissionSetting
      ? parseFloat(commissionSetting.value) / 100
      : 0.15;

    const totalAmount = parseFloat(quote.total_price) + parseFloat(quote.additional_charges || 0);
    const commissionAmount = totalAmount * commissionPercentage;
    const netAmount = totalAmount - commissionAmount;

    // Create transaction
    const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
    const transaction = await Transaction.create({
      transaction_id: transactionId,
      customer_id: customerId,
      supplier_id: request.supplier_id,
      booking_id: request.request_id,
      amount: totalAmount,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      payment_method: 'stripe',
      payment_status: 'completed',
      transaction_type: 'payment',
      description: `Payment for ${request.request_id}`,
    });

    // Find and assign an available bin
    let assignedBin = null;
    const availableBins = await PhysicalBin.findAll({
      supplier_id: request.supplier_id,
      bin_type_id: request.bin_type_id,
      bin_size_id: request.bin_size_id,
      status: 'available'
    });

    if (availableBins.length > 0) {
      assignedBin = availableBins[0];
      // Update bin status and link to request
      await PhysicalBin.update(assignedBin.id, {
        status: 'confirmed',
        current_customer_id: customerId,
        current_service_request_id: request.id
      });
    }

    // Update request payment status and bin_id
    await ServiceRequest.update(quote.service_request_id, {
      payment_status: 'paid',
      status: 'confirmed',
      bin_id: assignedBin ? assignedBin.id : null,
    });

    // Credit supplier wallet
    const wallet = await SupplierWallet.getOrCreate(request.supplier_id);
    await SupplierWallet.addCredit(
      wallet.id,
      netAmount,
      transaction.id,
      request.id,
      `Payment for ${request.request_id}`
    );

    const updatedQuote = await Quote.findById(id);
    const updatedRequest = await ServiceRequest.findById(quote.service_request_id);

    // Notify supplier
    const io = req.app.get('io');
    if (io) {
      io.to(`supplier_${quote.supplier_id}`).emit('quote_accepted', {
        quote: updatedQuote,
        request: updatedRequest,
      });

      io.to(`supplier_${quote.supplier_id}`).emit('payment_received', {
        request: updatedRequest,
        transaction,
        amount: netAmount,
      });
    }

    res.json({
      success: true,
      message: 'Quote accepted and payment processed successfully',
      data: { quote: updatedQuote, request: updatedRequest, transaction },
    });
  } catch (error) {
    console.error('Accept quote error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting quote',
      error: error.message,
    });
  }
};

// Admin: Get all quotes
const getAllQuotes = async (req, res) => {
  try {
    const { status, supplier_id, limit } = req.query;

    const quotes = await Quote.findAll({
      status,
      supplier_id,
      limit: limit ? parseInt(limit) : undefined,
    });

    res.json({
      success: true,
      data: { quotes },
    });
  } catch (error) {
    console.error('Get all quotes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quotes',
      error: error.message,
    });
  }
};

module.exports = {
  submitQuote,
  getQuotesByRequest,
  acceptQuote,
  getAllQuotes,
};
