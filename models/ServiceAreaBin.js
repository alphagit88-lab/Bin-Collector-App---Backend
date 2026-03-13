const pool = require('../config/database');

class ServiceAreaBin {
    /**
     * Create a new link between a service area and a bin size with a suggested price
     */
    static async create(data) {
        const { service_area_id, bin_size_id, bin_type_id, supplier_price } = data;
        const query = `
            INSERT INTO service_area_bins (service_area_id, bin_size_id, bin_type_id, supplier_price)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (service_area_id, bin_size_id) WHERE bin_size_id IS NOT NULL
            DO UPDATE SET 
                supplier_price = EXCLUDED.supplier_price,
                updated_at = NOW()
            RETURNING *
        `;
        // Handle unique constraint for null sizes
        const conflictQuery = bin_size_id 
          ? query 
          : `INSERT INTO service_area_bins (service_area_id, bin_size_id, bin_type_id, supplier_price)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (service_area_id, bin_type_id) WHERE bin_size_id IS NULL
             DO UPDATE SET 
                supplier_price = EXCLUDED.supplier_price,
                updated_at = NOW()
             RETURNING *`;

        const result = await pool.query(conflictQuery, [service_area_id, bin_size_id || null, bin_type_id || null, supplier_price]);
        return result.rows[0];
    }

    /**
     * Find all bin sizes configured for a specific service area
     */
    static async findByServiceArea(serviceAreaId) {
        const query = `
            SELECT 
                sab.*,
                bs.size AS bin_size_name,
                COALESCE(bt_direct.name, bt_join.name) AS bin_type_name
            FROM service_area_bins sab
            LEFT JOIN bin_sizes bs ON sab.bin_size_id = bs.id
            LEFT JOIN bin_types bt_join ON bs.bin_type_id = bt_join.id
            LEFT JOIN bin_types bt_direct ON sab.bin_type_id = bt_direct.id
            WHERE sab.service_area_id = $1
            ORDER BY bin_type_name, bs.size
        `;
        const result = await pool.query(query, [serviceAreaId]);
        return result.rows;
    }

    /**
     * Find available bins for a supplier (only those with an admin_final_price and is_active = true)
     */
    static async findActiveBySupplier(supplierId) {
        const query = `
            SELECT 
                sab.*,
                bs.size AS bin_size,
                bt.name AS bin_type,
                sa.country,
                sa.city
            FROM service_area_bins sab
            JOIN service_areas sa ON sab.service_area_id = sa.id
            JOIN bin_sizes bs ON sab.bin_size_id = bs.id
            JOIN bin_types bt ON bs.bin_type_id = bt.id
            WHERE sa.supplier_id = $1 AND sab.is_active = true
        `;
        const result = await pool.query(query, [supplierId]);
        return result.rows;
    }

    /**
     * Admin: Get pricing ranges for all bin types and sizes
     */
    static async getPriceRanges() {
        const query = `
            SELECT 
                bt.name AS bin_type,
                bs.size AS bin_size,
                bs.id AS bin_size_id,
                MIN(sab.supplier_price) AS min_price,
                MAX(sab.supplier_price) AS max_price,
                COUNT(sab.id) AS submission_count
            FROM bin_sizes bs
            JOIN bin_types bt ON bs.bin_type_id = bt.id
            LEFT JOIN service_area_bins sab ON bs.id = sab.bin_size_id
            GROUP BY bt.name, bs.size, bs.id
            ORDER BY bt.name, bs.size
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Admin: Set final price and activate a bin for a service area
     */
    static async updatePrice(id, finalPrice, isActive = true) {
        const query = `
            UPDATE service_area_bins
            SET 
                admin_final_price = $1,
                is_active = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `;
        const result = await pool.query(query, [finalPrice, isActive, id]);
        return result.rows[0];
    }

    /**
     * Find a specific configuration by ID
     */
    static async findById(id) {
        const query = `
            SELECT 
                sab.*,
                bs.size AS bin_size_name,
                bt.name AS bin_type_name,
                sa.supplier_id
            FROM service_area_bins sab
            JOIN bin_sizes bs ON sab.bin_size_id = bs.id
            JOIN bin_types bt ON bs.bin_type_id = bt.id
            JOIN service_areas sa ON sab.service_area_id = sa.id
            WHERE sab.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
    /**
     * Get finalized prices for a set of service areas
     */
    static async getFinalPricesForAreas(areaIds) {
        if (!areaIds || areaIds.length === 0) return [];
        
        const query = `
          SELECT 
            sab.*,
            bs.size as bin_size_name,
            bt.name as bin_type_name
          FROM service_area_bins sab
          JOIN bin_sizes bs ON sab.bin_size_id = bs.id
          JOIN bin_types bt ON bs.bin_type_id = bt.id
          WHERE sab.service_area_id = ANY($1)
            AND sab.is_active = TRUE
            AND sab.admin_final_price IS NOT NULL
        `;
        const result = await pool.query(query, [areaIds]);
        return result.rows;
    }

    /**
     * Admin: Find all submissions for review
     */
    static async findAllSubmissions() {
        const query = `
            SELECT 
                sab.*,
                bs.size AS bin_size_name,
                COALESCE(bt_direct.name, bt_join.name) AS bin_type_name,
                sa.city,
                sa.country,
                u.name AS supplier_name
            FROM service_area_bins sab
            LEFT JOIN bin_sizes bs ON sab.bin_size_id = bs.id
            LEFT JOIN bin_types bt_join ON bs.bin_type_id = bt_join.id
            LEFT JOIN bin_types bt_direct ON sab.bin_type_id = bt_direct.id
            JOIN service_areas sa ON sab.service_area_id = sa.id
            JOIN users u ON sa.supplier_id = u.id
            ORDER BY sab.is_active, sab.created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }
}

module.exports = ServiceAreaBin;
