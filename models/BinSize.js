const pool = require('../config/database');

class BinSize {
  static async findAll(binTypeId = null, includeInactive = false) {
    let query = 'SELECT bs.*, bt.name as bin_type_name FROM bin_sizes bs JOIN bin_types bt ON bs.bin_type_id = bt.id';
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (binTypeId) {
      conditions.push(`bs.bin_type_id = $${paramCount++}`);
      values.push(binTypeId);
    }

    if (!includeInactive) {
      conditions.push(`bs.is_active = $${paramCount++}`);
      values.push(true);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY bs.display_order, bs.size';
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT bs.*, bt.name as bin_type_name 
      FROM bin_sizes bs 
      JOIN bin_types bt ON bs.bin_type_id = bt.id 
      WHERE bs.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create({ bin_type_id, size, capacity_cubic_meters, display_order = 0 }) {
    const query = `
      INSERT INTO bin_sizes (bin_type_id, size, capacity_cubic_meters, display_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;
    const values = [bin_type_id, size, capacity_cubic_meters, display_order];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async update(id, { size, capacity_cubic_meters, is_active, display_order }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (size !== undefined) {
      updates.push(`size = $${paramCount++}`);
      values.push(size);
    }
    if (capacity_cubic_meters !== undefined) {
      updates.push(`capacity_cubic_meters = $${paramCount++}`);
      values.push(capacity_cubic_meters);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramCount++}`);
      values.push(display_order);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE bin_sizes 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM bin_sizes WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = BinSize;
