const ServiceRequest = require('../models/ServiceRequest');
const Quote = require('../models/Quote');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SupplierWallet = require('../models/SupplierWallet');
const SystemSetting = require('../models/SystemSetting');

// Create service request (customer orders a bin)
const createServiceRequest = async (req, res) => {
  try {
    const {
      service_category,
      bin_type_id,
      bin_size_id,
      location,
      start_date,
      end_date,
    } = req.body;

    const customerId = req.user.id;

    // Generate request ID
    const requestId = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;

    // Calculate estimated price (simple algorithm for now)
    const estimatedPrice = 100; // Base price, will be improved later

    const serviceRequest = await ServiceRequest.create({
      request_id: requestId,
      customer_id: customerId,
      service_category,
      bin_type_id,
      bin_size_id,
      location,
      start_date,
      end_date,
      estimated_price: estimatedPrice,
    });

    // Emit notification to ALL suppliers via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Broadcast to all suppliers in the 'suppliers' room
      io.to('suppliers').emit('new_request', {
        request: serviceRequest,
        message: 'New service request available',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: { serviceRequest },
    });
  } catch (error) {
    console.error('Create service request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service request',
      error: error.message,
    });
  }
};

// Get customer's service requests
const getMyRequests = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { status } = req.query;

    const requests = await ServiceRequest.findByCustomer(customerId, { status });

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requests',
      error: error.message,
    });
  }
};

// Get supplier's requests
const getSupplierRequests = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { status } = req.query;

    const requests = await ServiceRequest.findBySupplier(supplierId, { status });

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    console.error('Get supplier requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requests',
      error: error.message,
    });
  }
};

// Get pending requests for suppliers
const getPendingRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.findPendingForSuppliers();

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending requests',
      error: error.message,
    });
  }
};

// Get single request
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await ServiceRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }

    res.json({
      success: true,
      data: { request },
    });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching request',
      error: error.message,
    });
  }
};

// Accept service request (supplier accepts)
const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const supplierId = req.user.id;

    const request = await ServiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }

    if (request.supplier_id && request.supplier_id !== supplierId) {
      return res.status(403).json({
        success: false,
        message: 'This request is already assigned to another supplier',
      });
    }

    if (request.status !== 'pending' && request.status !== 'quoted') {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be accepted in current status',
      });
    }

    await ServiceRequest.update(id, {
      supplier_id: supplierId,
      status: 'quoted',
    });

    const updatedRequest = await ServiceRequest.findById(id);

    // Notify customer
    const io = req.app.get('io');
    if (io) {
      io.to(`customer_${request.customer_id}`).emit('request_accepted', {
        request: updatedRequest,
      });
    }

    res.json({
      success: true,
      message: 'Request accepted successfully',
      data: { request: updatedRequest },
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting request',
      error: error.message,
    });
  }
};

// Update request status
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const PhysicalBin = require('../models/PhysicalBin');

    const request = await ServiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }

    // Update request status
    await ServiceRequest.update(id, { status });
    const updatedRequest = await ServiceRequest.findById(id);

    // Update bin status if bin is assigned
    if (request.bin_id) {
      let binStatus = null;
      let clearBinAssignment = false;

      // Map service request status to bin status
      switch (status) {
        case 'confirmed':
          binStatus = 'confirmed';
          break;
        case 'in_progress':
          binStatus = 'loaded'; // When service request is in_progress, bin is loaded
          break;
        case 'loaded':
          binStatus = 'loaded';
          break;
        case 'delivered':
          binStatus = 'delivered';
          break;
        case 'ready_to_pickup':
          binStatus = 'ready_to_pickup';
          break;
        case 'picked_up':
          binStatus = 'picked_up';
          break;
        case 'completed':
          binStatus = 'available';
          clearBinAssignment = true;
          break;
        case 'cancelled':
          binStatus = 'available';
          clearBinAssignment = true;
          break;
      }

      if (binStatus) {
        const binUpdates = { status: binStatus };
        if (clearBinAssignment) {
          binUpdates.current_customer_id = null;
          binUpdates.current_service_request_id = null;
        }
        await PhysicalBin.update(request.bin_id, binUpdates);
      }
    }

    // Notify customer
    const io = req.app.get('io');
    if (io && updatedRequest) {
      io.to(`customer_${updatedRequest.customer_id}`).emit('request_status_updated', {
        request: updatedRequest,
      });
    }

    res.json({
      success: true,
      message: 'Request status updated successfully',
      data: { request: updatedRequest },
    });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating request status',
      error: error.message,
    });
  }
};

// Complete payment and process transaction
const processPayment = async (req, res) => {
  try {
    const { request_id, quote_id } = req.body;
    const customerId = req.user.id;

    const request = await ServiceRequest.findByRequestId(request_id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }

    if (request.customer_id !== customerId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const quote = await Quote.findById(quote_id);
    if (!quote || quote.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or not accepted quote',
      });
    }

    // Get commission percentage from settings
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
      booking_id: request_id,
      amount: totalAmount,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      payment_method: 'stripe',
      payment_status: 'completed',
      transaction_type: 'payment',
      description: `Payment for ${request_id}`,
    });

    // Update request payment status
    await ServiceRequest.update(request.id, {
      payment_status: 'paid',
      status: 'confirmed',
    });

    // Credit supplier wallet
    const wallet = await SupplierWallet.getOrCreate(request.supplier_id);
    await SupplierWallet.addCredit(
      wallet.id,
      netAmount,
      transaction.id,
      request.id,
      `Payment for ${request_id}`
    );

    // Notify supplier
    const io = req.app.get('io');
    if (io) {
      io.to(`supplier_${request.supplier_id}`).emit('payment_received', {
        request,
        transaction,
        amount: netAmount,
      });
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: { transaction },
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message,
    });
  }
};

// Admin: Get all service requests
const getAllServiceRequests = async (req, res) => {
  try {
    const { status, customer_id, supplier_id, limit } = req.query;

    const requests = await ServiceRequest.findAll({
      status,
      customer_id,
      supplier_id,
      limit: limit ? parseInt(limit) : undefined,
    });

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    console.error('Get all service requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service requests',
      error: error.message,
    });
  }
};

module.exports = {
  createServiceRequest,
  getMyRequests,
  getSupplierRequests,
  getPendingRequests,
  getRequestById,
  acceptRequest,
  updateRequestStatus,
  processPayment,
  getAllServiceRequests,
};
