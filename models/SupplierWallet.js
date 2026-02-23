const pool = require('../config/database');

class SupplierWallet {
  static async getOrCreate(supplierId) {
    let query = 'SELECT * FROM supplier_wallets WHERE supplier_id = $1';
    let result = await pool.query(query, [supplierId]);

    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO supplier_wallets (supplier_id, balance, pending_balance, total_earned, created_at, updated_at)
        VALUES ($1, 0, 0, 0, NOW(), NOW())
        RETURNING *
      `;
      result = await pool.query(insertQuery, [supplierId]);
    }

    return result.rows[0];
  }

  static async addCredit(walletId, amount, transactionId, serviceRequestId, description) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Add wallet transaction
      const transactionQuery = `
        INSERT INTO wallet_transactions (
          wallet_id,
          transaction_id,
          service_request_id,
          amount,
          transaction_type,
          description,
          status,
          created_at
        )
        VALUES ($1, $2, $3, $4, 'credit', $5, 'completed', NOW())
        RETURNING *
      `;
      await client.query(transactionQuery, [walletId, transactionId, serviceRequestId, amount, description]);

      // Update wallet balance
      const updateQuery = `
        UPDATE supplier_wallets
        SET balance = balance + $1,
            total_earned = total_earned + $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      const result = await client.query(updateQuery, [amount, walletId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async addDebit(walletId, amount, transactionId, serviceRequestId, description) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Add wallet transaction
      const transactionQuery = `
        INSERT INTO wallet_transactions (
          wallet_id,
          transaction_id,
          service_request_id,
          amount,
          transaction_type,
          description,
          status,
          created_at
        )
        VALUES ($1, $2, $3, $4, 'debit', $5, 'completed', NOW())
        RETURNING *
      `;
      await client.query(transactionQuery, [walletId, transactionId, serviceRequestId, amount, description]);

      // Update wallet balance (subtract the amount)
      const updateQuery = `
        UPDATE supplier_wallets
        SET balance = balance - $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      const result = await client.query(updateQuery, [amount, walletId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get wallet_transactions (credits from completed jobs) that are available for payout.
   * Excludes transactions already included in a non-rejected payout.
   */
  static async getPendingPayoutJobs(walletId) {
    const query = `
      SELECT 
        wt.id AS wallet_transaction_id,
        wt.amount,
        wt.description,
        wt.created_at,
        wt.service_request_id,
        sr.request_id AS service_request_code
      FROM wallet_transactions wt
      LEFT JOIN service_requests sr ON wt.service_request_id = sr.id
      WHERE wt.wallet_id = $1
        AND wt.transaction_type = 'credit'
        AND wt.status = 'completed'
        AND (
          NOT EXISTS (
            SELECT 1 FROM payout_items pi
            JOIN payouts p ON pi.payout_id = p.id
            WHERE pi.wallet_transaction_id = wt.id AND p.status != 'rejected'
          )
        )
      ORDER BY wt.created_at DESC
    `;
    const result = await pool.query(query, [walletId]);
    return result.rows;
  }

  static async requestPayout(walletId, walletTransactionIds, paymentMethod, bankDetails) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (!Array.isArray(walletTransactionIds) || walletTransactionIds.length === 0) {
        throw new Error('Select at least one job to include in the payout');
      }

      // Fetch and validate: all must belong to this wallet, be credit, completed, and not already in a non-rejected payout
      const placeholders = walletTransactionIds.map((_, i) => `$${i + 1}`).join(', ');
      const checkQuery = `
        SELECT wt.id, wt.amount, wt.wallet_id, wt.transaction_type, wt.status
        FROM wallet_transactions wt
        WHERE wt.id IN (${placeholders})
      `;
      const checkResult = await client.query(checkQuery, walletTransactionIds);

      if (checkResult.rows.length !== walletTransactionIds.length) {
        throw new Error('One or more selected jobs not found or do not belong to your wallet');
      }

      for (const row of checkResult.rows) {
        if (row.wallet_id !== parseInt(walletId, 10)) {
          throw new Error('One or more selected jobs do not belong to your wallet');
        }
        if (row.transaction_type !== 'credit' || row.status !== 'completed') {
          throw new Error('Only completed job earnings can be included in a payout');
        }
      }

      // Check if any are already in a pending/approved payout
      const inPayoutQuery = `
        SELECT pi.wallet_transaction_id FROM payout_items pi
        JOIN payouts p ON pi.payout_id = p.id
        WHERE pi.wallet_transaction_id = ANY($1::integer[]) AND p.status != 'rejected'
      `;
      const inPayout = await client.query(inPayoutQuery, [walletTransactionIds]);
      if (inPayout.rows.length > 0) {
        throw new Error('One or more selected jobs are already included in another payout request');
      }

      const amount = checkResult.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      if (amount <= 0) {
        throw new Error('Total amount must be greater than zero');
      }

      const wallet = await client.query('SELECT balance FROM supplier_wallets WHERE id = $1', [walletId]);
      if (parseFloat(wallet.rows[0].balance) < amount) {
        throw new Error('Insufficient balance');
      }

      // Create payout
      const payoutId = `PAYOUT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
      const payoutQuery = `
        INSERT INTO payouts (
          payout_id,
          supplier_id,
          wallet_id,
          amount,
          status,
          payment_method,
          bank_details,
          created_at,
          updated_at
        )
        VALUES ($1, (SELECT supplier_id FROM supplier_wallets WHERE id = $2), $2, $3, 'pending', $4, $5, NOW(), NOW())
        RETURNING *
      `;
      const payoutResult = await client.query(payoutQuery, [
        payoutId,
        walletId,
        amount,
        paymentMethod,
        bankDetails ? JSON.stringify(bankDetails) : null,
      ]);

      const newPayout = payoutResult.rows[0];

      // Link payout to selected jobs (payout_items)
      for (const row of checkResult.rows) {
        await client.query(
          `INSERT INTO payout_items (payout_id, wallet_transaction_id, amount) VALUES ($1, $2, $3)`,
          [newPayout.id, row.id, row.amount]
        );
      }

      // Create invoice for this payout
      const invoiceId = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
      const invoiceQuery = `
        INSERT INTO invoices (
          invoice_id,
          payout_id,
          supplier_id,
          total_amount,
          payment_method,
          payment_status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'unpaid', NOW(), NOW())
        RETURNING *
      `;
      await client.query(invoiceQuery, [
        invoiceId,
        newPayout.id,
        newPayout.supplier_id,
        amount,
        'payout'
      ]);

      // Deduct from balance and add to pending
      await client.query(
        `UPDATE supplier_wallets SET balance = balance - $1, pending_balance = pending_balance + $1, updated_at = NOW() WHERE id = $2`,
        [amount, walletId]
      );

      // Create wallet transaction (debit for payout request)
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id, amount, transaction_type, description, status, created_at)
         VALUES ($1, $2, 'debit', 'Payout request', 'pending', NOW())`,
        [walletId, amount]
      );

      await client.query('COMMIT');
      return newPayout;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getTransactions(walletId, limit = 50) {
    const query = `
      SELECT *
      FROM wallet_transactions
      WHERE wallet_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [walletId, limit]);
    return result.rows;
  }

  static async getPayouts(supplierId) {
    const query = `
      SELECT *
      FROM payouts
      WHERE supplier_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [supplierId]);
    return result.rows;
  }

  /**
   * Get line items (jobs) for a payout. Used for invoice display and payout detail.
   */
  static async getPayoutItems(payoutId) {
    const query = `
      SELECT 
        pi.id,
        pi.wallet_transaction_id,
        pi.amount,
        pi.created_at,
        wt.description,
        wt.service_request_id,
        sr.request_id AS service_request_code
      FROM payout_items pi
      JOIN wallet_transactions wt ON pi.wallet_transaction_id = wt.id
      LEFT JOIN service_requests sr ON wt.service_request_id = sr.id
      WHERE pi.payout_id = $1
      ORDER BY pi.id
    `;
    const result = await pool.query(query, [payoutId]);
    return result.rows;
  }

  static async findAllWallets() {
    const query = `
      SELECT 
        sw.*,
        u.name AS supplier_name,
        u.phone AS supplier_phone,
        u.email AS supplier_email
      FROM supplier_wallets sw
      LEFT JOIN users u ON sw.supplier_id = u.id
      ORDER BY sw.updated_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async findAllPayouts(filters = {}) {
    let query = `
      SELECT 
        p.*,
        u.name AS supplier_name,
        u.phone AS supplier_phone,
        u.email AS supplier_email
      FROM payouts p
      LEFT JOIN users u ON p.supplier_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND p.status = $${paramCount++}`;
      values.push(filters.status);
    }

    query += ` ORDER BY p.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async updatePayoutStatus(payoutId, status, adminNotes = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update payout status and admin notes
      // Also update processed_at if approved
      let updatePayoutQuery = `
        UPDATE payouts
        SET status = $1,
            admin_notes = $2,
            updated_at = NOW()
      `;

      if (status === 'approved') {
        updatePayoutQuery += `, processed_at = NOW()`;
      }

      updatePayoutQuery += ` WHERE id = $3 RETURNING *`;

      const result = await client.query(updatePayoutQuery, [status, adminNotes, payoutId]);

      if (result.rows.length === 0) {
        throw new Error('Payout not found');
      }

      const payout = result.rows[0];

      // If approved, update wallet pending balance and related invoice
      if (status === 'approved') {
        // 1. Update wallet balance
        await client.query(
          `UPDATE supplier_wallets 
           SET pending_balance = pending_balance - $1, updated_at = NOW()
           WHERE id = $2`,
          [payout.amount, payout.wallet_id]
        );

        // 2. Update linked invoice to paid
        await client.query(
          `UPDATE invoices 
           SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW()
           WHERE payout_id = $1`,
          [payout.id]
        );
      } else if (status === 'rejected') {
        // If rejected, return balance back to available balance
        await client.query(
          `UPDATE supplier_wallets 
           SET balance = balance + $1, 
               pending_balance = pending_balance - $1, 
               updated_at = NOW()
           WHERE id = $2`,
          [payout.amount, payout.wallet_id]
        );
      }

      await client.query('COMMIT');
      return payout;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = SupplierWallet;
