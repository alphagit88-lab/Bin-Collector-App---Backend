const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ name, phone, email, role, password, supplierType }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const supplier_type = role === 'supplier' ? (supplierType || null) : null;
    const query = `
      INSERT INTO users (name, phone, email, role, supplier_type, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, name, phone, email, role, supplier_type AS "supplierType", created_at, updated_at
    `;
    const values = [name, phone, email || null, role, supplier_type, hashedPassword];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByPhone(phone) {
    const query = `
      SELECT
        id,
        name,
        phone,
        email,
        role,
        supplier_type AS "supplierType",
        password_hash,
        created_at,
        updated_at
      FROM users
      WHERE phone = $1
    `;
    const result = await pool.query(query, [phone]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        id, 
        name, 
        phone, 
        email, 
        role,
        supplier_type AS "supplierType",
        created_at, 
        updated_at 
      FROM users 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT 
        id, 
        name, 
        phone, 
        email, 
        role,
        supplier_type AS "supplierType",
        created_at, 
        updated_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, { name, email, role, supplierType }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email || null);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (supplierType !== undefined) {
      updates.push(`supplier_type = $${paramCount++}`);
      values.push(supplierType || null);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, phone, email, role, supplier_type AS "supplierType", created_at, updated_at
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }
}

module.exports = User;
