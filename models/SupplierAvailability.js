const pool = require('../config/database');

class SupplierAvailability {
    // Get all availability records for a supplier
    static async findBySupplierId(supplierId) {
        const query = `
      SELECT 
        id,
        supplier_id,
        day_of_week AS "day",
        is_closed AS "isClosed",
        start_time AS "startTime",
        end_time AS "endTime"
      FROM supplier_availabilities
      WHERE supplier_id = $1
    `;
        const result = await pool.query(query, [supplierId]);
        return result.rows;
    }

    // Update or insert availability for a specific day
    static async upsert(supplierId, { day, isClosed, startTime, endTime }) {
        const query = `
      INSERT INTO supplier_availabilities (supplier_id, day_of_week, is_closed, start_time, end_time, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (supplier_id, day_of_week) 
      DO UPDATE SET 
        is_closed = EXCLUDED.is_closed,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        updated_at = NOW()
      RETURNING id, supplier_id, day_of_week AS "day", is_closed AS "isClosed", start_time AS "startTime", end_time AS "endTime"
    `;
        const values = [supplierId, day, isClosed, startTime, endTime];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // Bulk update availability (convenience method)
    static async bulkUpdate(supplierId, schedule) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const results = [];

            for (const item of schedule) {
                const query = `
          INSERT INTO supplier_availabilities (supplier_id, day_of_week, is_closed, start_time, end_time, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (supplier_id, day_of_week) 
          DO UPDATE SET 
            is_closed = EXCLUDED.is_closed,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            updated_at = NOW()
          RETURNING id, supplier_id, day_of_week AS "day", is_closed AS "isClosed", start_time AS "startTime", end_time AS "endTime"
        `;
                const values = [supplierId, item.day, item.isClosed, item.startTime, item.endTime];
                const res = await client.query(query, values);
                results.push(res.rows[0]);
            }

            await client.query('COMMIT');
            return results;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}

module.exports = SupplierAvailability;
