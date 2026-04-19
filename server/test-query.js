const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const oracledb = require('oracledb');
const db = require('./config/database');

(async () => {
  try {
    await db.initialize();
    const conn = await db.getConnection();
    
    // Get active semester
    const semResult = await conn.execute(
      `SELECT session_code FROM ACTIVE_SEMESTER WHERE id = 1`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const activeSem = semResult.rows.length > 0 ? semResult.rows[0].SESSION_CODE : null;
    console.log('Active Semester:', activeSem);
    
    // Test the exact query from admin.js
    const result = await conn.execute(
      `SELECT c.course_id, c.course_code, c.course_name, c.credits, c.course_type, d.dept_name,
              s.section_id, s.section_name, s.session_code AS semester, s.target_semester, s.room, s.schedule,
              CASE WHEN i.instructor_id IS NULL THEN NULL ELSE i.first_name || ' ' || i.last_name END AS coordinator
       FROM COURSE c
       JOIN DEPT d ON d.dept_id = c.dept_id
       LEFT JOIN SECTION s ON s.course_id = c.course_id AND (:sem IS NULL OR s.session_code = :sem)
       LEFT JOIN SECTION_COORDINATOR sc ON sc.section_id = s.section_id
       LEFT JOIN INSTRUCTOR i ON i.instructor_id = sc.instructor_id
       ORDER BY c.course_code, s.session_code, s.section_name`,
      { sem: activeSem },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    
    console.log('\nTotal rows returned:', result.rows.length);
    console.log('\nFirst 10 rows:');
    result.rows.slice(0, 10).forEach(r => {
      console.log(`  ${r.COURSE_CODE} - ${r.COURSE_NAME} | Sec: ${r.SECTION_NAME || 'NULL'} | Sem: ${r.SEMESTER || 'NULL'}`);
    });
    
    // Group by course code like the frontend does
    const courseGroups = result.rows.reduce((acc, row) => {
      const key = row.COURSE_CODE;
      if (!acc[key]) {
        acc[key] = {
          code: row.COURSE_CODE,
          name: row.COURSE_NAME,
          credits: row.CREDITS,
          dept: row.DEPT_NAME,
          courseType: row.COURSE_TYPE,
          sections: []
        };
      }
      if (row.SECTION_ID) {
        acc[key].sections.push(row);
      }
      return acc;
    }, {});
    
    console.log('\nUnique courses:', Object.keys(courseGroups).length);
    console.log('First 5 course groups:');
    Object.values(courseGroups).slice(0, 5).forEach(cg => {
      console.log(`  ${cg.code} - ${cg.name} | Sections: ${cg.sections.length}`);
    });
    
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
