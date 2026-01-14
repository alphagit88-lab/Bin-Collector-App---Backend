const pool = require('../config/database');

class Transaction {
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        t.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        s.name AS supplier_name,
        s.phone AS supplier_phone
      FROM transactions t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users s ON t.supplier_id = s.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.payment_status) {
      query += ` AND t.payment_status = $${paramCount++}`;
      values.push(filters.payment_status);
    }

    if (filters.customer_id) {
      query += ` AND t.customer_id = $${paramCount++}`;
      values.push(filters.customer_id);
    }

    if (filters.supplier_id) {
      query += ` AND t.supplier_id = $${paramCount++}`;
      values.push(filters.supplier_id);
    }

    if (filters.start_date) {
      query += ` AND t.created_at >= $${paramCount++}`;
      values.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND t.created_at <= $${paramCount++}`;
      values.push(filters.end_date);
    }

    query += ` ORDER BY t.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount++}`;
      values.push(filters.offset);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        t.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email
      FROM transactions t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users s ON t.supplier_id = s.id
      WHERE t.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByTransactionId(transactionId) {
    const query = `
      SELECT 
        t.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        s.name AS supplier_name,
        s.phone AS supplier_phone
      FROM transactions t
      LEFT JOIN users c ON t.customer_id = c.id
      LEFT JOIN users s ON t.supplier_id = s.id
      WHERE t.transaction_id = $1
    `;
    const result = await pool.query(query, [transactionId]);
    return result.rows[0];
  }

  static async create(data) {
    const {
      transaction_id,
      customer_id,
      supplier_id,
      booking_id,
      amount,
      commission_amount = 0,
      net_amount,
      payment_method = 'stripe',
      payment_status,
      transaction_type = 'payment',
      description,
      metadata,
    } = data;

    const query = `
      INSERT INTO transactions (
        transaction_id,
        customer_id,
        supplier_id,
        booking_id,
        amount,
        commission_amount,
        net_amount,
        payment_method,
        payment_status,
        transaction_type,
        description,
        metadata,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      transaction_id,
      customer_id,
      supplier_id || null,
      booking_id || null,
      amount,
      commission_amount,
      net_amount,
      payment_method,
      payment_status,
      transaction_type,
      description || null,
      metadata ? JSON.stringify(metadata) : null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async update(id, updates) {
    const allowedUpdates = [
      'payment_status',
      'description',
      'metadata',
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === 'metadata' && updates[key]) {
          updateFields.push(`${key} = $${paramCount++}`);
          values.push(JSON.stringify(updates[key]));
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
      UPDATE transactions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) AS total_transactions,
        COUNT(*) FILTER (WHERE payment_status = 'completed') AS completed_transactions,
        COUNT(*) FILTER (WHERE payment_status = 'pending') AS pending_transactions,
        COUNT(*) FILTER (WHERE payment_status = 'failed') AS failed_transactions,
        COALESCE(SUM(amount) FILTER (WHERE payment_status = 'completed'), 0) AS total_revenue,
        COALESCE(SUM(commission_amount) FILTER (WHERE payment_status = 'completed'), 0) AS total_commission
      FROM transactions
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = Transaction;
