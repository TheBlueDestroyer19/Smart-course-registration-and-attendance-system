const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const oracledb = require('oracledb');
const db = require('./config/database');

(async () => {
  try {
    await db.initialize();
    const conn = await db.getConnection();
    
    console.log('Updating active semester to ODD-2025...');
    
    // Delete and insert
    await conn.execute('DELETE FROM ACTIVE_SEMESTER WHERE id = 1', []);
    await conn.execute('INSERT INTO ACTIVE_SEMESTER (id, session_code) VALUES (1, :sem)', { sem: 'ODD-2025' });
    await conn.commit();
    
    console.log('✅ Updated');
    
    // Immediate verification
    const result = await conn.execute('SELECT session_code FROM ACTIVE_SEMESTER WHERE id = 1', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('✅ Verified - Active semester is now:', result.rows[0]?.SESSION_CODE || 'NULL');
    
    await conn.close();
    
    // Close connection pool
    await db.pool.close(0);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
