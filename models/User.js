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

  // Find suppliers who have available bins matching the requirements (single bin)
  static async findQualifiedSuppliers(binTypeId, binSizeId, location = null) {
    const query = `
      SELECT DISTINCT
        u.id,
        u.name,
        u.phone,
        u.email,
        COUNT(pb.id) as available_bin_count
      FROM users u
      INNER JOIN physical_bins pb ON u.id = pb.supplier_id
      WHERE u.role = 'supplier'
        AND pb.bin_type_id = $1
        AND pb.bin_size_id = $2
        AND pb.status = 'available'
        AND pb.supplier_id IS NOT NULL
      GROUP BY u.id, u.name, u.phone, u.email
      HAVING COUNT(pb.id) > 0
      ORDER BY available_bin_count DESC
    `;
    const result = await pool.query(query, [binTypeId, binSizeId]);
    return result.rows;
  }

  // Find suppliers who have ALL required bins available (for multiple bins per order)
  // orderItems should be an array of { bin_type_id, bin_size_id, quantity }
  static async findQualifiedSuppliersForMultipleBins(orderItems, location = null) {
    // Build a query that checks if supplier has at least the required quantity for each bin type/size combination
    // We'll use a CTE to count available bins per supplier per type/size, then filter suppliers who have all required bins
    
    const binRequirements = orderItems.map((item) => ({
      bin_type_id: parseInt(item.bin_type_id),
      bin_size_id: parseInt(item.bin_size_id),
      quantity: parseInt(item.quantity) || 1,
    }));

    if (binRequirements.length === 0) {
      return [];
    }

    // Build the query to check each requirement
    let query = `
      WITH supplier_bin_counts AS (
        SELECT 
          u.id as supplier_id,
          pb.bin_type_id as bin_type_id,
          pb.bin_size_id as bin_size_id,
          COUNT(*) as available_count
        FROM users u
        INNER JOIN physical_bins pb ON u.id = pb.supplier_id
        WHERE u.role = 'supplier'
          AND pb.status = 'available'
          AND pb.supplier_id IS NOT NULL
          AND (
    `;

    const values = [];
    let paramCount = 1;
    const conditions = binRequirements.map((req) => {
      const param1 = paramCount++;
      const param2 = paramCount++;
      values.push(req.bin_type_id, req.bin_size_id);
      return `(pb.bin_type_id = $${param1} AND pb.bin_size_id = $${param2})`;
    });

    query += conditions.join(' OR ');
    query += `
          )
        GROUP BY u.id, pb.bin_type_id, pb.bin_size_id
      ),
      supplier_requirements AS (
        SELECT 
          sbc.supplier_id,
          sbc.bin_type_id,
          sbc.bin_size_id,
          sbc.available_count,
          req.required_quantity
        FROM supplier_bin_counts sbc
        INNER JOIN (
    `;

    // Add the requirements as values - continue parameter numbering
    const requirementValues = [];
    binRequirements.forEach((req) => {
      const param1 = paramCount++;
      const param2 = paramCount++;
      requirementValues.push(`($${param1}::integer, $${param2}::integer, ${req.quantity}::integer)`);
      values.push(req.bin_type_id, req.bin_size_id);
    });

    query += `
          SELECT * FROM (VALUES ${requirementValues.join(', ')}) AS req(bin_type_id, bin_size_id, required_quantity)
        ) req ON sbc.bin_type_id = req.bin_type_id AND sbc.bin_size_id = req.bin_size_id
        WHERE sbc.available_count >= req.required_quantity
      )
      SELECT DISTINCT
        u.id,
        u.name,
        u.phone,
        u.email
      FROM users u
      WHERE u.role = 'supplier'
        AND u.id IN (
          SELECT sr.supplier_id
          FROM supplier_requirements sr
          GROUP BY sr.supplier_id
          HAVING COUNT(DISTINCT (sr.bin_type_id, sr.bin_size_id)) = $${paramCount}
        )
      ORDER BY u.name
    `;

    values.push(binRequirements.length); // Number of unique bin requirements

    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = User;
