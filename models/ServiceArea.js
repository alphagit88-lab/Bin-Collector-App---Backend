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

    // Find service areas covering a specific lat/lon coordinate
    static async findInRange(lat, lon) {
        const query = `
          SELECT *,
            (6371 * acos(
              cos(radians($1)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(latitude))
            )) AS distance
          FROM service_areas
          WHERE (
            6371 * acos(
              cos(radians($1)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(latitude))
            )
          ) <= area_radius_km
          ORDER BY distance ASC
        `;
        const result = await pool.query(query, [lat, lon]);
        return result.rows;
    }
}

module.exports = ServiceArea;
