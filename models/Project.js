const pool = require('../config/database');

class Project {
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM projects WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.customer_id) {
      query += ` AND customer_id = $${paramCount++}`;
      values.push(filters.customer_id);
    }

    if (filters.name) {
      query += ` AND name ILIKE $${paramCount++}`;
      values.push(`%${filters.name}%`);
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM projects WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByCustomerId(customerId) {
    const query = `
      SELECT p.*, COUNT(sr.id) as order_count
      FROM projects p
      LEFT JOIN service_requests sr ON p.id = sr.project_id
      WHERE p.customer_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [customerId]);
    return result.rows;
  }

  static async create({ customer_id, name, description }) {
    const query = `
      INSERT INTO projects (customer_id, name, description, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [customer_id, name, description]);
    return result.rows[0];
  }

  static async update(id, { name, description }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (updates.length === 0) return this.findById(id);

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE projects 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM projects WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getOrders(projectId) {
    const query = `
      SELECT 
        sr.*, 
        u.name as customer_name,
        bt.name AS bin_type_name,
        bs.size AS bin_size,
        (SELECT STRING_AGG(name, ', ') 
         FROM service_categories 
         WHERE id = ANY(ARRAY(SELECT jsonb_array_elements_text(sr.selected_services)::int))
        ) AS service_names
      FROM service_requests sr
      LEFT JOIN users u ON sr.customer_id = u.id
      LEFT JOIN bin_types bt ON sr.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON sr.bin_size_id = bs.id
      WHERE sr.project_id = $1
      ORDER BY sr.created_at DESC
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows;
  }
}

module.exports = Project;
