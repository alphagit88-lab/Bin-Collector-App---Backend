const pool = require('../config/database');

/**
 * Get invoices for the current user
 */
exports.getInvoices = async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT i.*, sr.request_id as service_request_number
            FROM invoices i
            JOIN service_requests sr ON i.request_id = sr.id
            WHERE i.user_id = $1
            ORDER BY i.created_at DESC
        `;
        const result = await pool.query(query, [userId]);

        res.status(200).json({
            success: true,
            invoices: result.rows
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices'
        });
    }
};

/**
 * Admin: Toggle billing visibility for a user
 */
exports.toggleBillingVisibility = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { userId, canViewBilling } = req.body;

        await pool.query(
            'UPDATE users SET can_view_billing = $1 WHERE id = $2',
            [canViewBilling, userId]
        );

        res.status(200).json({
            success: true,
            message: `Billing visibility ${canViewBilling ? 'enabled' : 'disabled'} for user`
        });
    } catch (error) {
        console.error('Error toggling billing visibility:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update billing visibility'
        });
    }
};
