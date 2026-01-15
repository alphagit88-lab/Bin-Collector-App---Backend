const pool = require('../config/database');

class Quote {
  static async create(data) {
    const {
      quote_id,
      service_request_id,
      supplier_id,
      total_price,
      additional_charges = 0,
      notes,
      expires_at,
    } = data;

    const query = `
      INSERT INTO quotes (
        quote_id,
        service_request_id,
        supplier_id,
        total_price,
        additional_charges,
        notes,
        status,
        expires_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      quote_id,
      service_request_id,
      supplier_id,
      total_price,
      additional_charges,
      notes || null,
      expires_at || null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByServiceRequest(serviceRequestId) {
    const query = `
      SELECT 
        q.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.supplier_type
      FROM quotes q
      LEFT JOIN users s ON q.supplier_id = s.id
      WHERE q.service_request_id = $1
      ORDER BY q.created_at DESC
    `;
    const result = await pool.query(query, [serviceRequestId]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        q.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone
      FROM quotes q
      LEFT JOIN users s ON q.supplier_id = s.id
      WHERE q.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async accept(quoteId) {
    const query = `
      UPDATE quotes
      SET status = 'accepted', updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `;
    const result = await pool.query(query, [quoteId]);
    return result.rows[0];
  }

  static async reject(quoteId) {
    const query = `
      UPDATE quotes
      SET status = 'rejected', updated_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `;
    const result = await pool.query(query, [quoteId]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT 
        q.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.supplier_type,
        sr.request_id,
        sr.customer_id,
        c.name AS customer_name
      FROM quotes q
      LEFT JOIN users s ON q.supplier_id = s.id
      LEFT JOIN service_requests sr ON q.service_request_id = sr.id
      LEFT JOIN users c ON sr.customer_id = c.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND q.status = $${paramCount++}`;
      values.push(filters.status);
    }

    if (filters.supplier_id) {
      query += ` AND q.supplier_id = $${paramCount++}`;
      values.push(filters.supplier_id);
    }

    query += ` ORDER BY q.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = Quote;
