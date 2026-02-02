const pool = require('../config/database');

class ServiceRequest {
  static async create(data) {
    const {
      request_id,
      customer_id,
      service_category,
      bin_type_id,
      bin_size_id,
      location,
      start_date,
      end_date,
      estimated_price,
      payment_method = 'online',
      contact_number,
      contact_email,
      instructions,
    } = data;

    const query = `
      INSERT INTO service_requests (
        request_id,
        customer_id,
        service_category,
        bin_type_id,
        bin_size_id,
        location,
        start_date,
        end_date,
        estimated_price,
        payment_method,
        contact_number,
        contact_email,
        instructions,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', NOW(), NOW())
      RETURNING *
    `;

    const values = [
      request_id,
      customer_id,
      service_category,
      bin_type_id,
      bin_size_id,
      location,
      start_date,
      end_date,
      estimated_price || null,
      payment_method,
      contact_number || null,
      contact_email || null,
      instructions || null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        sr.*,
        bt.name AS bin_type_name,
        bs.size AS bin_size,
        bs.capacity_cubic_meters,
        c.name AS customer_name,
        c.phone AS customer_phone,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        pb.bin_code,
        COALESCE(sr.invoice_id, i.invoice_id) AS invoice_id
      FROM service_requests sr
      LEFT JOIN bin_types bt ON sr.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON sr.bin_size_id = bs.id
      LEFT JOIN users c ON sr.customer_id = c.id
      LEFT JOIN users s ON sr.supplier_id = s.id
      LEFT JOIN physical_bins pb ON sr.bin_id = pb.id
      LEFT JOIN invoices i ON sr.id = i.service_request_id
      WHERE sr.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByRequestId(requestId) {
    const query = `
      SELECT 
        sr.*,
        bt.name AS bin_type_name,
        bs.size AS bin_size,
        c.name AS customer_name,
        s.name AS supplier_name,
        pb.bin_code,
        COALESCE(sr.invoice_id, i.invoice_id) AS invoice_id
      FROM service_requests sr
      LEFT JOIN bin_types bt ON sr.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON sr.bin_size_id = bs.id
      LEFT JOIN users c ON sr.customer_id = c.id
      LEFT JOIN users s ON sr.supplier_id = s.id
      LEFT JOIN physical_bins pb ON sr.bin_id = pb.id
      LEFT JOIN invoices i ON sr.id = i.service_request_id
      WHERE sr.request_id = $1
    `;
    const result = await pool.query(query, [requestId]);
    return result.rows[0];
  }

  static async findByCustomer(customerId, filters = {}) {
    let query = `
      SELECT 
        sr.*,
        bt.name AS bin_type_name,
        bs.size AS bin_size,
        pb.bin_code,
        COALESCE(sr.invoice_id, i.invoice_id) AS invoice_id,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.service_request_id = sr.id) AS order_items_count
      FROM service_requests sr
      LEFT JOIN bin_types bt ON sr.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON sr.bin_size_id = bs.id
      LEFT JOIN physical_bins pb ON sr.bin_id = pb.id
      LEFT JOIN invoices i ON sr.id = i.service_request_id
      WHERE sr.customer_id = $1
    `;
    const values = [customerId];
    let paramCount = 2;

    if (filters.status) {
      query += ` AND sr.status = $${paramCount++}`;
      values.push(filters.status);
    }

    query += ` ORDER BY sr.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findBySupplier(supplierId, filters = {}) {
    let query = `
      SELECT 
        sr.*,
        bt.name AS bin_type_name,
        bs.size AS bin_size,
        c.name AS customer_name,
        c.phone AS customer_phone,
        pb.bin_code,
        COALESCE(sr.invoice_id, i.invoice_id) AS invoice_id,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.service_request_id = sr.id) AS order_items_count
      FROM service_requests sr
      LEFT JOIN bin_types bt ON sr.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON sr.bin_size_id = bs.id
      LEFT JOIN users c ON sr.customer_id = c.id
      LEFT JOIN physical_bins pb ON sr.bin_id = pb.id
      LEFT JOIN invoices i ON sr.id = i.service_request_id
      WHERE sr.supplier_id = $1
    `;
    const values = [supplierId];
    let paramCount = 2;

    if (filters.status) {
      query += ` AND sr.status = $${paramCount++}`;
      values.push(filters.status);
    }

    query += ` ORDER BY sr.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findPendingForSuppliers() {
    const query = `
      SELECT 
        sr.*,
        bt.name AS bin_type_name,
        bs.size AS bin_size,
        c.name AS customer_name,
        c.phone AS customer_phone,
        pb.bin_code,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.service_request_id = sr.id) AS order_items_count
      FROM service_requests sr
      LEFT JOIN bin_types bt ON sr.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON sr.bin_size_id = bs.id
      LEFT JOIN users c ON sr.customer_id = c.id
      LEFT JOIN physical_bins pb ON sr.bin_id = pb.id
      WHERE sr.status = 'pending' AND sr.supplier_id IS NULL
      ORDER BY sr.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, updates) {
    const allowedUpdates = [
      'supplier_id',
      'status',
      'payment_status',
      'bin_id',
      'payment_method',
      'invoice_id',
      'contact_number',
      'contact_email',
      'instructions'
    ];
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
      UPDATE service_requests
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async assignSupplier(requestId, supplierId) {
    const query = `
      UPDATE service_requests
      SET supplier_id = $1, status = 'confirmed', updated_at = NOW()
      WHERE request_id = $2 AND status = 'pending'
      RETURNING *
    `;
    const result = await pool.query(query, [supplierId, requestId]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT 
        sr.*,
        bt.name AS bin_type_name,
        bs.size AS bin_size,
        c.name AS customer_name,
        c.phone AS customer_phone,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        COALESCE(sr.invoice_id, i.invoice_id) AS invoice_id,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.service_request_id = sr.id) AS order_items_count
      FROM service_requests sr
      LEFT JOIN bin_types bt ON sr.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON sr.bin_size_id = bs.id
      LEFT JOIN users c ON sr.customer_id = c.id
      LEFT JOIN users s ON sr.supplier_id = s.id
      LEFT JOIN invoices i ON sr.id = i.service_request_id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND sr.status = $${paramCount++}`;
      values.push(filters.status);
    }

    if (filters.customer_id) {
      query += ` AND sr.customer_id = $${paramCount++}`;
      values.push(filters.customer_id);
    }

    if (filters.supplier_id) {
      query += ` AND sr.supplier_id = $${paramCount++}`;
      values.push(filters.supplier_id);
    }

    query += ` ORDER BY sr.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = ServiceRequest;
