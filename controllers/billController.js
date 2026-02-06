const Bill = require('../models/Bill');

// Get all bills (admin)
const getAllBills = async (req, res) => {
    try {
        const { payment_status, customer_id, supplier_id } = req.query;

        const filters = {};
        if (payment_status) filters.payment_status = payment_status;
        if (customer_id) filters.customer_id = parseInt(customer_id);
        if (supplier_id) filters.supplier_id = parseInt(supplier_id);

        const bills = await Bill.findAll(filters);

        res.json({
            success: true,
            data: { bills },
        });
    } catch (error) {
        console.error('Get all bills error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bills',
            error: error.message,
        });
    }
};

// Get bill by ID
const getBillById = async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findById(id);

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found',
            });
        }

        res.json({
            success: true,
            data: { bill },
        });
    } catch (error) {
        console.error('Get bill error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bill',
            error: error.message,
        });
    }
};

// Get bill by bill_id (string)
const getBillByBillId = async (req, res) => {
    try {
        const { billId } = req.params;
        const bill = await Bill.findByBillId(billId);

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found',
            });
        }

        res.json({
            success: true,
            data: { bill },
        });
    } catch (error) {
        console.error('Get bill by billId error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bill',
            error: error.message,
        });
    }
};

module.exports = {
    getAllBills,
    getBillById,
    getBillByBillId,
};
