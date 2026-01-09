const pool = require('../config/database');

class SystemSetting {
  static async findAll(category = null, includePublic = false) {
    let query = 'SELECT * FROM system_settings WHERE 1=1';
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (category) {
      conditions.push(`category = $${paramCount++}`);
      values.push(category);
    }

    if (!includePublic) {
      conditions.push(`is_public = $${paramCount++}`);
      values.push(false);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY category, key';
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findByKey(key) {
    const query = 'SELECT * FROM system_settings WHERE key = $1';
    const result = await pool.query(query, [key]);
    return result.rows[0];
  }

  static async create({ key, value, type = 'string', description, category = 'general', is_public = false }) {
    const query = `
      INSERT INTO system_settings (key, value, type, description, category, is_public, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    const values = [key, value, type, description || null, category, is_public];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async update(key, { value, description, category, is_public }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (value !== undefined) {
      updates.push(`value = $${paramCount++}`);
      values.push(value);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (is_public !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(is_public);
    }

    if (updates.length === 0) {
      return await this.findByKey(key);
    }

    updates.push(`updated_at = NOW()`);
    values.push(key);

    const query = `
      UPDATE system_settings 
      SET ${updates.join(', ')}
      WHERE key = $${paramCount}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(key) {
    const query = 'DELETE FROM system_settings WHERE key = $1 RETURNING key';
    const result = await pool.query(query, [key]);
    return result.rows[0];
  }
}

module.exports = SystemSetting;
