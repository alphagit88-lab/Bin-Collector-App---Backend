const pool = require('../config/database');

class Bill {
    static async create(data) {
        const {
            bill_id,
            service_request_id,
            customer_id,
            supplier_id,
            total_amount,
            payment_method,
            payment_status = 'unpaid',
        } = data;

        const query = `
      INSERT INTO bills (
        bill_id,
        service_request_id,
        customer_id,
        supplier_id,
        total_amount,
        payment_method,
        payment_status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

        const values = [
            bill_id,
            service_request_id,
            customer_id,
            supplier_id,
            total_amount,
            payment_method,
            payment_status,
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async findById(id) {
        const query = `
      SELECT 
        b.*,
        sr.request_id AS service_request_code,
        c.name AS customer_name,
        c.email AS customer_email,
        s.name AS supplier_name,
        s.email AS supplier_email
      FROM bills b
      LEFT JOIN service_requests sr ON b.service_request_id = sr.id
      LEFT JOIN users c ON b.customer_id = c.id
      LEFT JOIN users s ON b.supplier_id = s.id
      WHERE b.id = $1
    `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async findByBillId(billId) {
        const query = `
      SELECT 
        b.*,
        sr.request_id AS service_request_code,
        c.name AS customer_name,
        c.email AS customer_email,
        s.name AS supplier_name,
        s.email AS supplier_email
      FROM bills b
      LEFT JOIN service_requests sr ON b.service_request_id = sr.id
      LEFT JOIN users c ON b.customer_id = c.id
      LEFT JOIN users s ON b.supplier_id = s.id
      WHERE b.bill_id = $1
    `;
        const result = await pool.query(query, [billId]);
        return result.rows[0];
    }

    static async findByServiceRequestId(serviceRequestId) {
        const query = `
      SELECT * FROM bills WHERE service_request_id = $1
    `;
        const result = await pool.query(query, [serviceRequestId]);
        return result.rows[0];
    }

    static async update(id, updates) {
        const allowedUpdates = ['payment_status', 'paid_at'];
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                updateFields.push(`${key} = $${paramCount++}`);
                values.push(updates[key]);
            }
        });

        if (updateFields.length === 0) {
            return await this.findById(id);
        }

        updateFields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
      UPDATE bills
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async findAll(filters = {}) {
        let query = `
      SELECT 
        b.*,
        sr.request_id AS service_request_code,
        c.name AS customer_name,
        s.name AS supplier_name
      FROM bills b
      LEFT JOIN service_requests sr ON b.service_request_id = sr.id
      LEFT JOIN users c ON b.customer_id = c.id
      LEFT JOIN users s ON b.supplier_id = s.id
      WHERE 1=1
    `;
        const values = [];
        let paramCount = 1;

        if (filters.customer_id) {
            query += ` AND b.customer_id = $${paramCount++}`;
            values.push(filters.customer_id);
        }

        if (filters.supplier_id) {
            query += ` AND b.supplier_id = $${paramCount++}`;
            values.push(filters.supplier_id);
        }

        if (filters.payment_status) {
            query += ` AND b.payment_status = $${paramCount++}`;
            values.push(filters.payment_status);
        }

        query += ` ORDER BY b.created_at DESC`;

        const result = await pool.query(query, values);
        return result.rows;
    }
}

module.exports = Bill;
