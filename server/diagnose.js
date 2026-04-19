const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const oracledb = require('oracledb');
const db = require('./config/database');

(async () => {
  try {
    await db.initialize();
    const conn = await db.getConnection();
    
    // Check courses count
    const courseRes = await conn.execute('SELECT COUNT(*) AS cnt FROM COURSE', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Total Courses:', courseRes.rows[0].CNT);
    
    // Check sections count
    const sectionRes = await conn.execute('SELECT COUNT(*) AS cnt FROM SECTION', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Total Sections:', sectionRes.rows[0].CNT);
    
    // Check active semester
    const semRes = await conn.execute('SELECT session_code FROM ACTIVE_SEMESTER WHERE id = 1', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const activeSem = semRes.rows[0]?.SESSION_CODE || 'None';
    console.log('Active Semester:', activeSem);
    
    // Check sections in active semester
    if (activeSem !== 'None') {
      const activeSectionRes = await conn.execute('SELECT COUNT(*) AS cnt FROM SECTION WHERE session_code = :sem', { sem: activeSem }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      console.log('Sections in Active Semester:', activeSectionRes.rows[0].CNT);
    }
    
    // Sample courses with sections
    const sampleRes = await conn.execute(
      "SELECT DISTINCT c.course_id, c.course_code, c.course_name, s.session_code, s.section_name FROM COURSE c LEFT JOIN SECTION s ON s.course_id = c.course_id WHERE ROWNUM <= 5",
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log('\nSample Courses:');
    sampleRes.rows.forEach(r => 
      console.log(`  ${r.COURSE_CODE} - ${r.COURSE_NAME} (ID: ${r.COURSE_ID}, Sec: ${r.SECTION_NAME || 'None'}, Sem: ${r.SESSION_CODE || 'None'})`)
    );
    
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
