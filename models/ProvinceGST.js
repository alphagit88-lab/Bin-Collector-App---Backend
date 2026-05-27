const pool = require('../config/database');

class ProvinceGST {
  static async findAll() {
    const query = 'SELECT * FROM province_gst ORDER BY province_name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findByProvinceCode(provinceCode) {
    const query = 'SELECT * FROM province_gst WHERE province_code = $1';
    const result = await pool.query(query, [provinceCode]);
    return result.rows[0];
  }

  static async updateByProvinceCode(provinceCode, { gstRate }) {
    const query = `
      UPDATE province_gst 
      SET gst_rate = $1, updated_at = NOW()
      WHERE province_code = $2
      RETURNING *
    `;
    const result = await pool.query(query, [gstRate, provinceCode]);
    return result.rows[0];
  }

  static async create({ provinceCode, provinceName, gstRate }) {
    const query = `
      INSERT INTO province_gst (province_code, province_name, gst_rate, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [provinceCode, provinceName, gstRate]);
    return result.rows[0];
  }

  static async delete(provinceCode) {
    const query = 'DELETE FROM province_gst WHERE province_code = $1 RETURNING *';
    const result = await pool.query(query, [provinceCode]);
    return result.rows[0];
  }
}

module.exports = ProvinceGST;
