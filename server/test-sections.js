require('dotenv').config({path:'../.env'});
const oracledb = require('oracledb');

async function test() {
  const conn = await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING
  });

  const res = await conn.execute("SELECT COUNT(*) as cnt FROM SECTION WHERE session_code = 'ODD-2026'", [], {outFormat:oracledb.OUT_FORMAT_OBJECT});
  console.log('Sections in ODD-2026:', res.rows[0].CNT);

  await conn.close();
}

test();