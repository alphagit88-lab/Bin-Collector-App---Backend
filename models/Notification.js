const pool = require('../config/database');

class Notification {
  static async create({ userId, title, message, type, relatedId }) {
    const query = `
      INSERT INTO notifications (user_id, title, message, type, related_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [userId, title, message, type || null, relatedId || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async markAsRead(id, userId) {
    const query = `
      UPDATE notifications 
      SET read_at = NOW() 
      WHERE id = $1 AND user_id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications 
      SET read_at = NOW() 
      WHERE user_id = $1 AND read_at IS NULL
    `;
    await pool.query(query, [userId]);
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) FROM notifications 
      WHERE user_id = $1 AND read_at IS NULL
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  static async delete(id, userId) {
    const query = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2';
    await pool.query(query, [id, userId]);
  }
}

module.exports = Notification;
