const CustomerInvoice = require('../models/CustomerInvoice');
const ServiceRequest = require('../models/ServiceRequest');
const SystemSetting = require('../models/SystemSetting');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const generateInvoiceId = () => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CUST-INV-${timestamp}-${random}`;
};

const getAllCustomerInvoices = async (req, res) => {
  try {
    const { customer_id, service_category, month, year, payment_status } = req.query;

    const filters = {};
    if (customer_id) filters.customer_id = parseInt(customer_id);
    if (service_category) filters.service_category = service_category;
    if (month) filters.month = parseInt(month);
    if (year) filters.year = parseInt(year);
    if (payment_status) filters.payment_status = payment_status;

    const invoices = await CustomerInvoice.findAll(filters);

    res.json({
      success: true,
      data: { invoices },
    });
  } catch (error) {
    console.error('Get all customer invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer invoices',
      error: error.message,
    });
  }
};

const getCommercialOrders = async (req, res) => {
  try {
    const serviceRequests = await ServiceRequest.findAll({ service_category: 'commercial' });
    res.json({
      success: true,
      data: { orders: serviceRequests },
    });
  } catch (error) {
    console.error('Get commercial orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching commercial orders',
      error: error.message,
    });
  }
};

const getCustomerInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await CustomerInvoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Customer invoice not found',
      });
    }

    res.json({
      success: true,
      data: { invoice },
    });
  } catch (error) {
    console.error('Get customer invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer invoice',
      error: error.message,
    });
  }
};

const generateCustomerInvoiceFromOrder = async (req, res) => {
  try {
    const { service_request_id } = req.body;

    if (!service_request_id) {
      return res.status(400).json({
        success: false,
        message: 'service_request_id is required',
      });
    }

    const serviceRequest = await ServiceRequest.findById(parseInt(service_request_id));

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
      });
    }

    const subtotal = parseFloat(serviceRequest.total_price || serviceRequest.estimated_price || 0);
    const defaultGstRateSetting = await SystemSetting.findByKey('default_gst_rate');
    const defaultGstRate = parseFloat(defaultGstRateSetting?.value || 5.00);

    const gstAmount = subtotal * (defaultGstRate / 100);
    const totalAmount = subtotal + gstAmount;

    const invoiceId = generateInvoiceId();
    const orderDate = new Date(serviceRequest.created_at || serviceRequest.start_date);
    const month = orderDate.getMonth() + 1;
    const year = orderDate.getFullYear();

    const uploadDir = path.join(__dirname, '../uploads/customer-invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const pdfPath = path.join(uploadDir, `${invoiceId}.pdf`);
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(20).text('Customer Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice ID: ${invoiceId}`, { align: 'left' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
    doc.text(`Customer: ${serviceRequest.customer_name}`, { align: 'left' });
    doc.text(`Customer ID: ${serviceRequest.customer_id}`, { align: 'left' });
    doc.text(`Request ID: ${serviceRequest.request_id}`, { align: 'left' });
    doc.text(`Service Category: ${serviceRequest.service_category.charAt(0).toUpperCase() + serviceRequest.service_category.slice(1)}`, { align: 'left' });
    doc.text(`Location: ${serviceRequest.location}`, { align: 'left' });
    doc.moveDown();

    doc.text('Order Details:', { underline: true });
    doc.moveDown();
    doc.text(`Bin Type: ${serviceRequest.bin_type_name || 'N/A'}`);
    doc.text(`Bin Size: ${serviceRequest.bin_size || 'N/A'}`);
    if (serviceRequest.start_date) {
      doc.text(`Start Date: ${new Date(serviceRequest.start_date).toLocaleDateString()}`);
    }
    if (serviceRequest.end_date) {
      doc.text(`End Date: ${new Date(serviceRequest.end_date).toLocaleDateString()}`);
    }
    doc.moveDown();

    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, { align: 'right' });
    doc.text(`GST (${defaultGstRate.toFixed(2)}%): $${gstAmount.toFixed(2)}`, { align: 'right' });
    doc.text(`Total: $${totalAmount.toFixed(2)}`, { align: 'right', bold: true });
    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const pdfUrl = `/uploads/customer-invoices/${invoiceId}.pdf`;

    const invoice = await CustomerInvoice.create({
      invoice_id: invoiceId,
      customer_id: serviceRequest.customer_id,
      service_category: serviceRequest.service_category,
      month,
      year,
      total_amount: totalAmount,
      gst_amount: gstAmount,
      gst_rate: defaultGstRate,
      payment_status: 'unpaid',
      pdf_url: pdfUrl,
    });

    res.json({
      success: true,
      data: { invoice, pdf_url: pdfUrl },
    });
  } catch (error) {
    console.error('Generate customer invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating customer invoice',
      error: error.message,
    });
  }
};

module.exports = {
  getAllCustomerInvoices,
  getCommercialOrders,
  getCustomerInvoiceById,
  generateCustomerInvoiceFromOrder,
};
