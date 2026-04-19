const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const oracledb = require('oracledb');
const db = require('./config/database');

(async () => {
  try {
    await db.initialize();
    const conn = await db.getConnection();

    console.log('=== DATABASE DIAGNOSTICS ===');

    // Check active semester
    const semRes = await conn.execute('SELECT session_code FROM ACTIVE_SEMESTER WHERE id = 1', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const activeSem = semRes.rows[0]?.SESSION_CODE || 'None';
    console.log('Active Semester:', activeSem);

    // Check total courses
    const courseRes = await conn.execute('SELECT COUNT(*) AS cnt FROM COURSE', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Total Courses:', courseRes.rows[0].CNT);

    // Check sections in active semester
    const sectionRes = await conn.execute('SELECT COUNT(*) AS cnt FROM SECTION WHERE session_code = :sem', { sem: activeSem }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Sections in Active Semester:', sectionRes.rows[0].CNT);

    // Check section coordinators
    const coordRes = await conn.execute('SELECT COUNT(*) AS cnt FROM SECTION_COORDINATOR', [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    console.log('Section Coordinators:', coordRes.rows[0].CNT);

    // Sample sections with coordinators
    const sampleRes = await conn.execute(
      `SELECT s.section_id, s.section_name, s.session_code, c.course_code, c.course_name,
             i.first_name || ' ' || i.last_name AS coordinator
      FROM SECTION s
      JOIN COURSE c ON c.course_id = s.course_id
      LEFT JOIN SECTION_COORDINATOR sc ON sc.section_id = s.section_id
      LEFT JOIN INSTRUCTOR i ON i.instructor_id = sc.instructor_id
      WHERE s.session_code = '${activeSem}' AND ROWNUM <= 10`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log('\nSample Sections with Coordinators:');
    sampleRes.rows.forEach(r => {
      console.log(`  ${r.COURSE_CODE} ${r.SECTION_NAME} - ${r.COORDINATOR || 'No coordinator'}`);
    });

    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
