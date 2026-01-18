const pool = require('../config/database');

class OrderItem {
  static async create(data) {
    const {
      service_request_id,
      bin_type_id,
      bin_size_id,
      physical_bin_id = null,
      status = 'pending',
    } = data;

    const query = `
      INSERT INTO order_items (
        service_request_id,
        bin_type_id,
        bin_size_id,
        physical_bin_id,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      service_request_id,
      bin_type_id,
      bin_size_id,
      physical_bin_id,
      status,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByServiceRequest(serviceRequestId) {
    const query = `
      SELECT 
        oi.*,
        bt.name AS bin_type_name,
        bs.size AS bin_size,
        pb.bin_code,
        pb.status AS physical_bin_status
      FROM order_items oi
      LEFT JOIN bin_types bt ON oi.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON oi.bin_size_id = bs.id
      LEFT JOIN physical_bins pb ON oi.physical_bin_id = pb.id
      WHERE oi.service_request_id = $1
      ORDER BY oi.created_at ASC
    `;
    const result = await pool.query(query, [serviceRequestId]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        oi.*,
        bt.name AS bin_type_name,
        bs.size AS bin_size,
        pb.bin_code,
        pb.status AS physical_bin_status
      FROM order_items oi
      LEFT JOIN bin_types bt ON oi.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON oi.bin_size_id = bs.id
      LEFT JOIN physical_bins pb ON oi.physical_bin_id = pb.id
      WHERE oi.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, updates) {
    const allowedUpdates = ['physical_bin_id', 'status'];
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
      UPDATE order_items
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateByServiceRequest(serviceRequestId, updates) {
    const allowedUpdates = ['status'];
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
      return [];
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(serviceRequestId);

    const query = `
      UPDATE order_items
      SET ${updateFields.join(', ')}
      WHERE service_request_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async delete(id) {
    const query = 'DELETE FROM order_items WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = OrderItem;
