const pool = require('../config/database');
const { parsePagination, paginationMeta, extractWindowTotal, stripWindowTotal } = require('../utils/pagination');

/**
 * Get invoices for the current user
 */
exports.getInvoices = async (req, res) => {
    try {
        const userId = req.user.id;

        const role = req.user.role;
        const { startDate, endDate, search } = req.query;
        const pagination = parsePagination(req.query);

        let query = `
            SELECT
                b.id,
                COUNT(*) OVER() AS total_count,
                b.bill_id          AS invoice_number,
                b.total_amount     AS amount,
                b.payment_status   AS status,
                b.payment_method,
                b.bill_date        AS created_at,
                sr.request_id      AS service_request_number
            FROM bills b
            JOIN service_requests sr ON b.service_request_id = sr.id
        `;

        query += role === 'supplier' ? ` WHERE b.supplier_id = $1` : ` WHERE b.customer_id = $1`;
        const values = [userId];
        let paramCount = 2;
        if (startDate) { query += ` AND b.bill_date >= $${paramCount++}::date`; values.push(startDate); }
        if (endDate) { query += ` AND b.bill_date < ($${paramCount++}::date + INTERVAL '1 day')`; values.push(endDate); }
        if (search) {
            query += ` AND (b.bill_id ILIKE $${paramCount} OR sr.request_id ILIKE $${paramCount})`;
            values.push(`%${search}%`);
            paramCount++;
        }
        query += ` ORDER BY b.bill_date DESC`;
        if (pagination.limit) { query += ` LIMIT $${paramCount++}`; values.push(pagination.limit); }
        if (pagination.offset) { query += ` OFFSET $${paramCount++}`; values.push(pagination.offset); }

        const result = await pool.query(query, values);
        const total = extractWindowTotal(result.rows);
        const invoices = stripWindowTotal(result.rows);
        const summaryResult = await pool.query(
            `SELECT COUNT(*)::int AS total,
                    COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::numeric AS total_paid
             FROM bills WHERE ${role === 'supplier' ? 'supplier_id' : 'customer_id'} = $1`,
            [userId]
        );

        res.status(200).json({
            success: true,
            invoices,
            summary: summaryResult.rows[0],
            ...(pagination.requested ? { pagination: paginationMeta(pagination.page, pagination.limit, total) } : {})
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
