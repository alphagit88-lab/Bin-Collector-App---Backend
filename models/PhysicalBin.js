const pool = require('../config/database');

class PhysicalBin {
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        pb.*,
        bt.name as bin_type_name,
        bs.size as bin_size,
        bs.capacity_cubic_meters,
        u_supplier.name as supplier_name,
        u_supplier.phone as supplier_phone,
        u_customer.name as customer_name,
        u_customer.phone as customer_phone,
        sr.request_id,
        sr.location as current_location
      FROM physical_bins pb
      JOIN bin_types bt ON pb.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON pb.bin_size_id = bs.id
      LEFT JOIN users u_supplier ON pb.supplier_id = u_supplier.id
      LEFT JOIN users u_customer ON pb.current_customer_id = u_customer.id
      LEFT JOIN service_requests sr ON pb.current_service_request_id = sr.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.supplier_id) {
      query += ` AND pb.supplier_id = $${paramCount++}`;
      values.push(filters.supplier_id);
    }

    if (filters.status) {
      query += ` AND pb.status = $${paramCount++}`;
      values.push(filters.status);
    }

    if (filters.bin_code) {
      query += ` AND pb.bin_code ILIKE $${paramCount++}`;
      values.push(`%${filters.bin_code}%`);
    }

    if (filters.bin_type_id) {
      query += ` AND pb.bin_type_id = $${paramCount++}`;
      values.push(filters.bin_type_id);
    }

    if (filters.bin_size_id) {
      query += ` AND pb.bin_size_id = $${paramCount++}`;
      values.push(filters.bin_size_id);
    }

    query += ' ORDER BY pb.created_at DESC';
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        pb.*,
        bt.name as bin_type_name,
        bs.size as bin_size,
        bs.capacity_cubic_meters,
        u_supplier.name as supplier_name,
        u_supplier.phone as supplier_phone,
        u_customer.name as customer_name,
        u_customer.phone as customer_phone,
        sr.request_id,
        sr.location as current_location
      FROM physical_bins pb
      JOIN bin_types bt ON pb.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON pb.bin_size_id = bs.id
      LEFT JOIN users u_supplier ON pb.supplier_id = u_supplier.id
      LEFT JOIN users u_customer ON pb.current_customer_id = u_customer.id
      LEFT JOIN service_requests sr ON pb.current_service_request_id = sr.id
      WHERE pb.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByCode(binCode) {
    const query = `
      SELECT 
        pb.*,
        bt.name as bin_type_name,
        bs.size as bin_size,
        bs.capacity_cubic_meters,
        u_supplier.name as supplier_name,
        u_supplier.phone as supplier_phone,
        u_customer.name as customer_name,
        u_customer.phone as customer_phone,
        sr.request_id,
        sr.location as current_location
      FROM physical_bins pb
      JOIN bin_types bt ON pb.bin_type_id = bt.id
      LEFT JOIN bin_sizes bs ON pb.bin_size_id = bs.id
      LEFT JOIN users u_supplier ON pb.supplier_id = u_supplier.id
      LEFT JOIN users u_customer ON pb.current_customer_id = u_customer.id
      LEFT JOIN service_requests sr ON pb.current_service_request_id = sr.id
      WHERE pb.bin_code = $1
    `;
    const result = await pool.query(query, [binCode]);
    return result.rows[0];
  }

  static async create({ bin_code, bin_type_id, bin_size_id, supplier_id, status = 'available', notes }) {
    const query = `
      INSERT INTO physical_bins (bin_code, bin_type_id, bin_size_id, supplier_id, status, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    const values = [bin_code, bin_type_id, bin_size_id, supplier_id || null, status, notes || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async update(id, { bin_code, bin_type_id, bin_size_id, supplier_id, status, current_customer_id, current_service_request_id, notes }) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (bin_code !== undefined) {
      updates.push(`bin_code = $${paramCount++}`);
      values.push(bin_code);
    }
    if (bin_type_id !== undefined) {
      updates.push(`bin_type_id = $${paramCount++}`);
      values.push(bin_type_id);
    }
    if (bin_size_id !== undefined) {
      updates.push(`bin_size_id = $${paramCount++}`);
      values.push(bin_size_id);
    }
    if (supplier_id !== undefined) {
      updates.push(`supplier_id = $${paramCount++}`);
      values.push(supplier_id);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (current_customer_id !== undefined) {
      updates.push(`current_customer_id = $${paramCount++}`);
      values.push(current_customer_id);
    }
    if (current_service_request_id !== undefined) {
      updates.push(`current_service_request_id = $${paramCount++}`);
      values.push(current_service_request_id);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes || null);
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE physical_bins 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM physical_bins WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async generateBinCode() {
    // Generate a unique bin code: BIN-XXXXX (5 random alphanumeric)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let exists = true;

    while (exists) {
      code = 'BIN-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const existing = await pool.query('SELECT id FROM physical_bins WHERE bin_code = $1', [code]);
      exists = existing.rows.length > 0;
    }

    return code;
  }
}

module.exports = PhysicalBin;
