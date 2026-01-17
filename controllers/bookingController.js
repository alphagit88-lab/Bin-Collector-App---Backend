const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SupplierWallet = require('../models/SupplierWallet');
const SystemSetting = require('../models/SystemSetting');
const Invoice = require('../models/Invoice');
const PhysicalBin = require('../models/PhysicalBin');

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
      payment_method = 'online', // Default to online
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
      payment_method,
    });

    // Find qualified suppliers (those with available bins matching requirements)
    const qualifiedSuppliers = await User.findQualifiedSuppliers(
      bin_type_id,
      bin_size_id,
      location
    );

    // Emit notification only to qualified suppliers via Socket.io
    const io = req.app.get('io');
    if (io && qualifiedSuppliers.length > 0) {
      // Notify each qualified supplier individually
      qualifiedSuppliers.forEach((supplier) => {
        io.to(`supplier_${supplier.id}`).emit('new_request', {
          request: serviceRequest,
          message: 'New service request available',
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      data: { 
        serviceRequest: {
          ...serviceRequest,
          payment_method: payment_method || 'online'
        },
        qualifiedSuppliersCount: qualifiedSuppliers.length
      },
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

// Accept service request (supplier accepts) - directly confirms order
const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { total_price } = req.body; // Supplier provides price when accepting
    const supplierId = req.user.id;

    if (!total_price || parseFloat(total_price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total price is required',
      });
    }

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

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request cannot be accepted in current status',
      });
    }

    const totalAmount = parseFloat(total_price);
    const paymentMethod = request.payment_method || 'online';

    // Update request to confirmed with supplier
    await ServiceRequest.update(id, {
      supplier_id: supplierId,
      status: 'confirmed',
    });

    const updatedRequest = await ServiceRequest.findById(id);

    // Create invoice when order is confirmed
    const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
    const invoice = await Invoice.create({
      invoice_id: invoiceId,
      service_request_id: id,
      customer_id: request.customer_id,
      supplier_id: supplierId,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'online' ? 'paid' : 'unpaid',
    });

    let transaction = null;
    let netAmount = null;

    // Process payment based on payment method
    if (paymentMethod === 'online') {
      // Online payment: process immediately
      const commissionSetting = await SystemSetting.findByKey('platform_commission_percentage');
      const commissionPercentage = commissionSetting
        ? parseFloat(commissionSetting.value) / 100
        : 0.15;

      const commissionAmount = totalAmount * commissionPercentage;
      netAmount = totalAmount - commissionAmount;

      // Create transaction
      const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
      transaction = await Transaction.create({
        transaction_id: transactionId,
        customer_id: request.customer_id,
        supplier_id: supplierId,
        booking_id: request.request_id,
        amount: totalAmount,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        payment_method: 'stripe',
        payment_status: 'completed',
        transaction_type: 'payment',
        description: `Payment for ${request.request_id}`,
      });

      // Update invoice payment status
      await Invoice.update(invoice.id, {
        payment_status: 'paid',
        paid_at: new Date(),
      });

      // Update request payment status
      await ServiceRequest.update(id, {
        payment_status: 'paid',
      });

      // Credit supplier wallet
      const wallet = await SupplierWallet.getOrCreate(supplierId);
      await SupplierWallet.addCredit(
        wallet.id,
        netAmount,
        transaction.id,
        id,
        `Payment for ${request.request_id}`
      );
    } else {
      // Cash payment: will be collected when delivered
      await ServiceRequest.update(id, {
        payment_status: 'pending',
      });
    }

    // Notify customer
    const io = req.app.get('io');
    if (io) {
      io.to(`customer_${request.customer_id}`).emit('request_accepted', {
        request: updatedRequest,
        invoice,
      });

      if (transaction && netAmount !== null) {
        io.to(`supplier_${supplierId}`).emit('payment_received', {
          request: updatedRequest,
          transaction,
          amount: netAmount,
        });
      }
    }

    res.json({
      success: true,
      message: 'Request accepted and confirmed successfully',
      data: { 
        request: updatedRequest,
        invoice,
        transaction: transaction || null
      },
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
    const { status, bin_code } = req.body; // bin_code required when status is 'on_delivery' (loaded)
    const PhysicalBin = require('../models/PhysicalBin');
    const Invoice = require('../models/Invoice');
    const Transaction = require('../models/Transaction');
    const SupplierWallet = require('../models/SupplierWallet');
    const SystemSetting = require('../models/SystemSetting');

    const request = await ServiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }

    // Validate supplier can only update their own requests
    if (req.user.role === 'supplier' && request.supplier_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own requests',
      });
    }

    // When status changes to 'on_delivery' (loaded), supplier must assign a bin
    if (status === 'on_delivery') {
      if (!bin_code) {
        return res.status(400).json({
          success: false,
          message: 'Bin code is required when status changes to on_delivery',
        });
      }

      // Find the bin by code and verify it belongs to the supplier
      const bin = await PhysicalBin.findByCode(bin_code);
      if (!bin) {
        return res.status(404).json({
          success: false,
          message: 'Bin not found',
        });
      }

      if (bin.supplier_id !== request.supplier_id) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign bins registered under your name',
        });
      }

      if (bin.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: 'Bin is not available',
        });
      }

      // Assign bin to request
      await ServiceRequest.update(id, { 
        status: 'on_delivery',
        bin_id: bin.id 
      });

      // Update bin status to loaded
      await PhysicalBin.update(bin.id, {
        status: 'loaded',
        current_customer_id: request.customer_id,
        current_service_request_id: id,
      });
    } else {
      // Update request status
      await ServiceRequest.update(id, { status });
    }

    const updatedRequest = await ServiceRequest.findById(id);

    // Update bin status based on order status
    if (updatedRequest.bin_id) {
      let binStatus = null;
      let clearBinAssignment = false;

      // Map service request status to bin status
      switch (status) {
        case 'on_delivery':
          binStatus = 'loaded';
          break;
        case 'delivered':
          binStatus = 'delivered';
          // If cash order, collect payment now
          if (request.payment_method === 'cash') {
            const invoice = await Invoice.findByServiceRequest(id);
            if (invoice && invoice.payment_status === 'unpaid') {
              const commissionSetting = await SystemSetting.findByKey('platform_commission_percentage');
              const commissionPercentage = commissionSetting
                ? parseFloat(commissionSetting.value) / 100
                : 0.15;

              const totalAmount = parseFloat(invoice.total_amount);
              const commissionAmount = totalAmount * commissionPercentage;
              const netAmount = totalAmount - commissionAmount;

              // Create transaction
              const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
              const transaction = await Transaction.create({
                transaction_id: transactionId,
                customer_id: request.customer_id,
                supplier_id: request.supplier_id,
                booking_id: request.request_id,
                amount: totalAmount,
                commission_amount: commissionAmount,
                net_amount: netAmount,
                payment_method: 'cash',
                payment_status: 'completed',
                transaction_type: 'payment',
                description: `Cash payment for ${request.request_id}`,
              });

              // Update invoice
              await Invoice.update(invoice.id, {
                payment_status: 'paid',
                paid_at: new Date(),
              });

              // Update request payment status
              await ServiceRequest.update(id, {
                payment_status: 'paid',
              });

              // Credit supplier wallet
              const wallet = await SupplierWallet.getOrCreate(request.supplier_id);
              await SupplierWallet.addCredit(
                wallet.id,
                netAmount,
                transaction.id,
                id,
                `Cash payment for ${request.request_id}`
              );
            }
          }
          break;
        case 'ready_to_pickup':
          binStatus = 'ready_to_pickup';
          break;
        case 'pickup':
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
        await PhysicalBin.update(updatedRequest.bin_id, binUpdates);
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
  getAllServiceRequests,
};
