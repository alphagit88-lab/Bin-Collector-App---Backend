const pool = require('../config/database');

class Invoice {
  static async create(data) {
    const {
      invoice_id,
      payout_id,
      supplier_id,
      total_amount,
      payment_method = 'payout',
      payment_status = 'unpaid',
    } = data;

    const query = `
      INSERT INTO invoices (
        invoice_id,
        payout_id,
        supplier_id,
        total_amount,
        payment_method,
        payment_status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      invoice_id,
      payout_id,
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
        p.payout_id AS payout_transaction_id,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email
      FROM invoices i
      LEFT JOIN payouts p ON i.payout_id = p.id
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
        p.payout_id AS payout_transaction_id,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email
      FROM invoices i
      LEFT JOIN payouts p ON i.payout_id = p.id
      LEFT JOIN users s ON i.supplier_id = s.id
      WHERE i.invoice_id = $1
    `;
    const result = await pool.query(query, [invoiceId]);
    return result.rows[0];
  }

  static async findByPayoutId(payoutId) {
    const query = `
      SELECT 
        i.*,
        p.payout_id AS payout_transaction_id,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email
      FROM invoices i
      LEFT JOIN payouts p ON i.payout_id = p.id
      LEFT JOIN users s ON i.supplier_id = s.id
      WHERE i.payout_id = $1
      ORDER BY i.created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [payoutId]);
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
        p.payout_id AS payout_transaction_id,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email
      FROM invoices i
      LEFT JOIN payouts p ON i.payout_id = p.id
      LEFT JOIN users s ON i.supplier_id = s.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

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

    if (filters.payout_id) {
      query += ` AND i.payout_id = $${paramCount++}`;
      values.push(filters.payout_id);
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
