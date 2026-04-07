const pool = require('../config/database');

class Conversation {
  static async findOrCreateOrderConversation(orderId, participant1Id, participant2Id) {
    // Check if conversation already exists for this order between these participants
    const checkQuery = `
      SELECT * FROM conversations 
      WHERE order_id = $1 
      AND ((participant1_id = $2 AND participant2_id = $3) OR (participant1_id = $3 AND participant2_id = $2))
    `;
    const checkResult = await pool.query(checkQuery, [orderId, participant1Id, participant2Id]);
    
    if (checkResult.rows.length > 0) {
      return checkResult.rows[0];
    }

    // Create new conversation
    const insertQuery = `
      INSERT INTO conversations (order_id, type, participant1_id, participant2_id)
      VALUES ($1, 'order', $2, $3)
      RETURNING *
    `;
    const insertResult = await pool.query(insertQuery, [orderId, participant1Id, participant2Id]);
    return insertResult.rows[0];
  }

  static async findOrCreateSupportConversation(userId) {
    // Find admin user (role = 'admin')
    const adminQuery = "SELECT id FROM users WHERE role = 'admin' LIMIT 1";
    const adminResult = await pool.query(adminQuery);
    
    if (adminResult.rows.length === 0) {
      throw new Error('Admin user not found');
    }
    
    const adminId = adminResult.rows[0].id;

    // Check if conversation already exists
    const checkQuery = `
      SELECT * FROM conversations 
      WHERE type = 'support' 
      AND ((participant1_id = $1 AND participant2_id = $2) OR (participant1_id = $2 AND participant2_id = $1))
    `;
    const checkResult = await pool.query(checkQuery, [userId, adminId]);
    
    if (checkResult.rows.length > 0) {
      return checkResult.rows[0];
    }

    // Create new conversation
    const insertQuery = `
      INSERT INTO conversations (type, participant1_id, participant2_id)
      VALUES ('support', $1, $2)
      RETURNING *
    `;
    const insertResult = await pool.query(insertQuery, [userId, adminId]);
    return insertResult.rows[0];
  }

  static async findByUserId(userId) {
    const query = `
      SELECT 
        c.*,
        u1.name as p1_name,
        u2.name as p2_name,
        (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_text,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at_actual,
        (
          SELECT COUNT(*)::int
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id != $1
            AND m.read_at IS NULL
        ) as unread_count
      FROM conversations c
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      WHERE participant1_id = $1 OR participant2_id = $1
      ORDER BY last_message_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findById(id, userId) {
    const query = `
      SELECT c.*, 
             u1.name as p1_name, 
             u2.name as p2_name
      FROM conversations c
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      WHERE c.id = $1 AND (c.participant1_id = $2 OR c.participant2_id = $2)
    `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  static async updateLastMessageAt(id) {
    const query = 'UPDATE conversations SET last_message_at = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }
}

module.exports = Conversation;
