const pool = require('../config/database');

class ServiceArea {
    static async create({ supplierId, country, city, areaRadiusKm, latitude, longitude }) {
        const query = `
      INSERT INTO service_areas (supplier_id, country, city, area_radius_km, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
        const values = [supplierId, country, city, areaRadiusKm, latitude, longitude];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    static async findBySupplierId(supplierId) {
        const query = `
      SELECT * FROM service_areas
      WHERE supplier_id = $1
      ORDER BY created_at DESC
    `;
        const result = await pool.query(query, [supplierId]);
        return result.rows;
    }

    static async findById(id) {
        const query = `
      SELECT * FROM service_areas
      WHERE id = $1
    `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    static async delete(id, supplierId) {
        const query = `
      DELETE FROM service_areas
      WHERE id = $1 AND supplier_id = $2
      RETURNING id
    `;
        const result = await pool.query(query, [id, supplierId]);
        return result.rows[0];
    }

    // Find suppliers who cover a specific location
    // This uses a simplified distance calculation (Haversine formula could be implemented in DB function for better precision)
    // For now, checking if supplier has a service area that includes the given point would require more complex GIS queries or PostGIS.
    // Instead, successful matching often relies on 'city' match or a simple radius check if we convert everything to coords.
}

module.exports = ServiceArea;
