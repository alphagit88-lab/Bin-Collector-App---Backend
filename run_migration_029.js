const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '029_add_driver_role_and_assignment.sql'), 'utf8');
        console.log('Running migration 029...');
        await pool.query(sql);
        console.log('✅ Migration 029 completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 029 failed:', error);
        process.exit(1);
    }
};

runMigration();
