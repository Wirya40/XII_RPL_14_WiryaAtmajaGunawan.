const mysql = require('mysql2/promise');

module.exports = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'db_siswa',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10
});