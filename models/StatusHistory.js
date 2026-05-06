const pool = require('../config/database');

class StatusHistory {
  static async create(data) {
    const { service_request_id, status, changed_by } = data;
    const query = `
      INSERT INTO status_history (service_request_id, status, changed_by, changed_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [service_request_id, status, changed_by || null]);
    return result.rows[0];
  }

  static async findByServiceRequest(serviceRequestId) {
    const query = `
      SELECT * FROM status_history 
      WHERE service_request_id = $1 
      ORDER BY changed_at ASC
    `;
    const result = await pool.query(query, [serviceRequestId]);
    return result.rows;
  }
}

module.exports = StatusHistory;
