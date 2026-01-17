const pool = require('../config/database');

class Invoice {
  static async create(data) {
    const {
      invoice_id,
      service_request_id,
      customer_id,
      supplier_id,
      total_amount,
      payment_method,
      payment_status = 'unpaid',
    } = data;

    const query = `
      INSERT INTO invoices (
        invoice_id,
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
      invoice_id,
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
        i.*,
        sr.request_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        s.name AS supplier_name,
        s.phone AS supplier_phone
      FROM invoices i
      LEFT JOIN service_requests sr ON i.service_request_id = sr.id
      LEFT JOIN users c ON i.customer_id = c.id
      LEFT JOIN users s ON i.supplier_id = s.id
      WHERE i.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByInvoiceId(invoiceId) {
    const query = `
      SELECT 
        i.*,
        sr.request_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        s.name AS supplier_name,
        s.phone AS supplier_phone
      FROM invoices i
      LEFT JOIN service_requests sr ON i.service_request_id = sr.id
      LEFT JOIN users c ON i.customer_id = c.id
      LEFT JOIN users s ON i.supplier_id = s.id
      WHERE i.invoice_id = $1
    `;
    const result = await pool.query(query, [invoiceId]);
    return result.rows[0];
  }

  static async findByServiceRequest(serviceRequestId) {
    const query = `
      SELECT 
        i.*,
        sr.request_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        s.name AS supplier_name,
        s.phone AS supplier_phone
      FROM invoices i
      LEFT JOIN service_requests sr ON i.service_request_id = sr.id
      LEFT JOIN users c ON i.customer_id = c.id
      LEFT JOIN users s ON i.supplier_id = s.id
      WHERE i.service_request_id = $1
      ORDER BY i.created_at DESC
      LIMIT 1
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
        if (key === 'paid_at') {
          updateFields.push(`${key} = $${paramCount++}`);
          values.push(updates[key] || new Date());
        } else {
          updateFields.push(`${key} = $${paramCount++}`);
          values.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE invoices
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
        i.*,
        sr.request_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        s.name AS supplier_name,
        s.phone AS supplier_phone
      FROM invoices i
      LEFT JOIN service_requests sr ON i.service_request_id = sr.id
      LEFT JOIN users c ON i.customer_id = c.id
      LEFT JOIN users s ON i.supplier_id = s.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.customer_id) {
      query += ` AND i.customer_id = $${paramCount++}`;
      values.push(filters.customer_id);
    }

    if (filters.supplier_id) {
      query += ` AND i.supplier_id = $${paramCount++}`;
      values.push(filters.supplier_id);
    }

    if (filters.payment_status) {
      query += ` AND i.payment_status = $${paramCount++}`;
      values.push(filters.payment_status);
    }

    if (filters.payment_method) {
      query += ` AND i.payment_method = $${paramCount++}`;
      values.push(filters.payment_method);
    }

    query += ` ORDER BY i.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = Invoice;
