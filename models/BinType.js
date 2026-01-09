const pool = require('../config/database');

class BinType {
  static async findAll(includeInactive = false) {
    const query = includeInactive
      ? 'SELECT * FROM bin_types ORDER BY display_order, name'
      : 'SELECT * FROM bin_types WHERE is_active = true ORDER BY display_order, name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM bin_types WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create({ name, description, display_order = 0 }) {
    const query = `
      INSERT INTO bin_types (name, description, display_order, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;
    const values = [name, description || null, display_order];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async update(id, { name, description, is_active, display_order }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
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
      UPDATE bin_types 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM bin_types WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = BinType;
