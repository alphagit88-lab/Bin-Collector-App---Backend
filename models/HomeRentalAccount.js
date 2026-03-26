const pool = require("../config/database");

class HomeRentalAccount {
  static async create({ userId, email, appRole }, client = pool) {
    const query = `
      INSERT INTO home_rental_accounts (
        user_id,
        email,
        app_role,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, LOWER($2), $3, TRUE, NOW(), NOW())
      RETURNING
        id AS "accountId",
        user_id AS "userId",
        email,
        app_role AS "appRole",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const result = await client.query(query, [userId, email, appRole]);
    return result.rows[0];
  }

  static async findByEmail(email, client = pool) {
    const query = `
      SELECT
        hra.id AS "accountId",
        hra.user_id AS "userId",
        hra.email,
        hra.app_role AS "appRole",
        hra.is_active AS "isActive",
        hra.created_at AS "accountCreatedAt",
        hra.updated_at AS "accountUpdatedAt",
        u.name,
        u.phone,
        u.role AS "systemRole",
        u.supplier_type AS "supplierType",
        u.supplier_id AS "supplierId",
        u.push_token AS "pushToken",
        u.password_hash AS "passwordHash",
        u.created_at AS "userCreatedAt",
        u.updated_at AS "userUpdatedAt"
      FROM home_rental_accounts hra
      JOIN users u ON u.id = hra.user_id
      WHERE LOWER(hra.email) = LOWER($1)
      LIMIT 1
    `;

    const result = await client.query(query, [email]);
    return result.rows[0];
  }

  static async findByUserId(userId, client = pool) {
    const query = `
      SELECT
        hra.id AS "accountId",
        hra.user_id AS "userId",
        hra.email,
        hra.app_role AS "appRole",
        hra.is_active AS "isActive",
        hra.created_at AS "accountCreatedAt",
        hra.updated_at AS "accountUpdatedAt",
        u.name,
        u.phone,
        u.role AS "systemRole",
        u.supplier_type AS "supplierType",
        u.supplier_id AS "supplierId",
        u.push_token AS "pushToken",
        u.created_at AS "userCreatedAt",
        u.updated_at AS "userUpdatedAt"
      FROM home_rental_accounts hra
      JOIN users u ON u.id = hra.user_id
      WHERE hra.user_id = $1
      LIMIT 1
    `;

    const result = await client.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = HomeRentalAccount;
