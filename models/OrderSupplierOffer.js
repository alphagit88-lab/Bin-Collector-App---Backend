const pool = require('../config/database');

class OrderSupplierOffer {
  /**
   * Bulk insert offers for candidate suppliers
   * @param {Array<{ service_request_id: number, supplier_id: number, offered_price?: number }>} offers 
   */
  static async createBulk(offers = []) {
    if (!offers || offers.length === 0) return [];

    const values = [];
    const valuePlaceholders = [];
    let paramCount = 1;

    for (const offer of offers) {
      valuePlaceholders.push(`($${paramCount++}, $${paramCount++}, $${paramCount++}, 'offered')`);
      values.push(offer.service_request_id, offer.supplier_id, offer.offered_price || null);
    }

    const query = `
      INSERT INTO order_supplier_offers (service_request_id, supplier_id, offered_price, status)
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (service_request_id, supplier_id) DO UPDATE
      SET offered_price = EXCLUDED.offered_price, status = 'offered', updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Find all candidate offers for a specific service request
   */
  static async findByServiceRequest(serviceRequestId) {
    const query = `
      SELECT oso.*, u.name as supplier_name, u.phone as supplier_phone, u.email as supplier_email,
             u.push_token as "pushToken"
      FROM order_supplier_offers oso
      JOIN users u ON oso.supplier_id = u.id
      WHERE oso.service_request_id = $1
      ORDER BY oso.offered_price ASC NULLS LAST
    `;
    const result = await pool.query(query, [serviceRequestId]);
    return result.rows;
  }

  /**
   * Atomically mark the winning supplier as accepted and all other candidate offers as claimed_by_other
   */
  static async markClaimed(serviceRequestId, winningSupplierId) {
    // 1. Mark winning supplier
    await pool.query(
      `UPDATE order_supplier_offers 
       SET status = 'accepted', updated_at = NOW() 
       WHERE service_request_id = $1 AND supplier_id = $2`,
      [serviceRequestId, winningSupplierId]
    );

    // 2. Mark other suppliers as claimed_by_other and return their supplier IDs so we can notify them
    const result = await pool.query(
      `UPDATE order_supplier_offers 
       SET status = 'claimed_by_other', updated_at = NOW() 
       WHERE service_request_id = $1 AND supplier_id != $2 AND status = 'offered'
       RETURNING supplier_id`,
      [serviceRequestId, winningSupplierId]
    );

    return result.rows.map(r => r.supplier_id);
  }

  /**
   * Cancel all offers for a request (e.g. if customer cancels before acceptance)
   */
  static async cancelAll(serviceRequestId) {
    const result = await pool.query(
      `UPDATE order_supplier_offers 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE service_request_id = $1 AND status = 'offered'
       RETURNING supplier_id`,
      [serviceRequestId]
    );
    return result.rows.map(r => r.supplier_id);
  }
}

module.exports = OrderSupplierOffer;
