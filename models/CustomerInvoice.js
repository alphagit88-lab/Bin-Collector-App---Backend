const pool = require('../config/database');

class CustomerInvoice {
  static async create(data) {
    const {
      invoice_id,
      customer_id,
      service_category,
      month,
      year,
      total_amount,
      gst_amount,
      gst_rate,
      payment_status = 'unpaid',
      payment_method,
      pdf_url,
    } = data;

    const query = `
      INSERT INTO customer_invoices (
        invoice_id,
        customer_id,
        service_category,
        month,
        year,
        total_amount,
        gst_amount,
        gst_rate,
        payment_status,
        payment_method,
        pdf_url,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      invoice_id, customer_id, service_category, month, year, total_amount, gst_amount, gst_rate, payment_status, payment_method, pdf_url];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT 
        ci.*,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone
      FROM customer_invoices ci
      LEFT JOIN users u ON ci.customer_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.customer_id) {
      query += ` AND ci.customer_id = $${paramCount++}`;
      values.push(filters.customer_id);
    }

    if (filters.service_category) {
      query += ` AND ci.service_category = $${paramCount++}`;
      values.push(filters.service_category);
    }

    if (filters.month) {
      query += ` AND ci.month = $${paramCount++}`;
      values.push(filters.month);
    }

    if (filters.year) {
      query += ` AND ci.year = $${paramCount++}`;
      values.push(filters.year);
    }

    if (filters.payment_status) {
      query += ` AND ci.payment_status = $${paramCount++}`;
      values.push(filters.payment_status);
    }

    query += ` ORDER BY ci.created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        ci.*,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone
      FROM customer_invoices ci
      LEFT JOIN users u ON ci.customer_id = u.id
      WHERE ci.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByInvoiceId(invoiceId) {
    const query = `
      SELECT 
        ci.*,
        u.name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone
      FROM customer_invoices ci
      LEFT JOIN users u ON ci.customer_id = u.id
      WHERE ci.invoice_id = $1
    `;
    const result = await pool.query(query, [invoiceId]);
    return result.rows[0];
  }

  static async update(id, updates) {
    const allowedUpdates = [
      'payment_status', 
      'payment_method', 
      'paid_at', 
      'pdf_url'
    ];
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
      UPDATE customer_invoices
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = CustomerInvoice;
