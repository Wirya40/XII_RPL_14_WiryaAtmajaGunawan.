const express = require('express');
const path = require('path');
const db = require('./config/db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const wrap = fn => (req, res) => fn(req, res).catch(err => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});


function cek(b, kelasIds) {
  const d = {
    nis: String(b.nis ?? '').trim(),
    nama: String(b.nama ?? '').trim(),
    jk: b.jk,
    tgl_lahir: String(b.tgl_lahir ?? ''),
    alamat: String(b.alamat ?? '').trim(),
    telepon: String(b.telepon ?? '').trim(),
    kelas_id: Number(b.kelas_id)
  };
  const e = [];
  if (!/^\d{5,10}$/.test(d.nis)) e.push('NIS wajib diisi, 5-10 digit angka.');
  if (!d.nama || d.nama.length > 100) e.push('Nama wajib diisi (maks 100 karakter).');
  if (!['L', 'P'].includes(d.jk)) e.push('Jenis kelamin wajib dipilih.');
  const t = new Date(d.tgl_lahir);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tgl_lahir) || isNaN(t) || t > new Date()) e.push('Tanggal lahir tidak valid.');
  if (d.telepon && !/^08\d{8,12}$/.test(d.telepon)) e.push('Telepon harus diawali 08 dan 10-14 digit.');
  if (!kelasIds.includes(d.kelas_id)) e.push('Kelas wajib dipilih.');
  return [d, e];
}

async function simpan(req, res, id) {
  const [kl] = await db.query('SELECT id FROM kelas');
  const [d, e] = cek(req.body, kl.map(k => k.id));
  if (!e.length) {
    const [x] = await db.execute('SELECT COUNT(*) c FROM siswa WHERE nis=? AND id<>?', [d.nis, id]);
    if (x[0].c) e.push('NIS sudah terdaftar.');
  }
  if (e.length) return res.status(400).json({ error: e.join(' | ') });
  const v = Object.values(d);
  if (id) await db.execute('UPDATE siswa SET nis=?,nama=?,jk=?,tgl_lahir=?,alamat=?,telepon=?,kelas_id=? WHERE id=?', [...v, id]);
  else await db.execute('INSERT INTO siswa(nis,nama,jk,tgl_lahir,alamat,telepon,kelas_id) VALUES(?,?,?,?,?,?,?)', v);
  res.json({ ok: true });
}

app.get('/api/kelas', wrap(async (req, res) => {
  const [r] = await db.query('SELECT * FROM kelas ORDER BY nama_kelas');
  res.json(r);
}));

app.get('/api/ringkasan', wrap(async (req, res) => {
  const [[t]] = await db.query('SELECT COUNT(*) total, COALESCE(SUM(total_dibayar=0),0) belum FROM siswa');
  const [[u]] = await db.query('SELECT COALESCE(SUM(jumlah),0) uang FROM pembayaran');
  const [rekap] = await db.query(`SELECT k.nama_kelas, k.wali_kelas, COUNT(s.id) jml, COALESCE(SUM(s.total_dibayar),0) uang
    FROM kelas k LEFT JOIN siswa s ON s.kelas_id=k.id GROUP BY k.id ORDER BY k.nama_kelas`);
  res.json({ total: t.total, belum: Number(t.belum), uang: u.uang, rekap });
}));


app.get('/api/siswa', wrap(async (req, res) => {
  const q = `%${req.query.q || ''}%`, k = Number(req.query.k) || 0;
  let sql = 'SELECT s.*, k.nama_kelas FROM siswa s JOIN kelas k ON k.id=s.kelas_id WHERE (s.nama LIKE ? OR s.nis LIKE ?)';
  const p = [q, q];
  if (k) { sql += ' AND s.kelas_id=?'; p.push(k); }
  const [r] = await db.execute(sql + ' ORDER BY s.nama', p);
  res.json(r);
}));

app.get('/api/siswa/:id', wrap(async (req, res) => {
  const [s] = await db.execute('SELECT s.*, k.nama_kelas FROM siswa s JOIN kelas k ON k.id=s.kelas_id WHERE s.id=?', [req.params.id]);
  if (!s.length) return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
  const [p] = await db.execute('SELECT * FROM pembayaran WHERE siswa_id=? ORDER BY tgl_bayar DESC', [req.params.id]);
  res.json({ ...s[0], pembayaran: p });
}));

app.post('/api/siswa', wrap((req, res) => simpan(req, res, 0)));
app.put('/api/siswa/:id', wrap((req, res) => simpan(req, res, Number(req.params.id))));

app.delete('/api/siswa/:id', wrap(async (req, res) => {
  try {
    await db.execute('DELETE FROM siswa WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2')
      return res.status(409).json({ error: 'Gagal hapus: siswa masih memiliki riwayat pembayaran.' });
    throw err;
  }
}));


app.get('/api/pembayaran', wrap(async (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const [r] = await db.execute(`SELECT p.*, s.nis, s.nama FROM pembayaran p JOIN siswa s ON s.id=p.siswa_id
    WHERE s.nama LIKE ? OR p.bulan LIKE ? ORDER BY p.tgl_bayar DESC`, [q, q]);
  res.json(r);
}));

app.post('/api/pembayaran', wrap(async (req, res) => {
  const sid = Number(req.body.siswa_id), bulan = String(req.body.bulan ?? '').trim(), jml = Number(req.body.jumlah);
  const [s] = await db.execute('SELECT id FROM siswa WHERE id=?', [sid]);
  const e = [];
  if (!s.length) e.push('Siswa wajib dipilih.');
  if (!bulan || bulan.length > 20) e.push('Bulan wajib diisi (maks 20 karakter).');
  if (!Number.isFinite(jml) || jml <= 0 || jml > 10000000) e.push('Jumlah harus angka lebih dari 0 dan maksimal 10.000.000.');
  if (e.length) return res.status(400).json({ error: e.join(' | ') });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('INSERT INTO pembayaran(siswa_id,bulan,jumlah) VALUES(?,?,?)', [sid, bulan, jml]);
    await conn.execute('UPDATE siswa SET total_dibayar = total_dibayar + ? WHERE id=?', [jml, sid]);
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Transaksi gagal, data dibatalkan.' });
  } finally {
    conn.release();
  }
}));

app.listen(3000, () => console.log('Aplikasi berjalan di http://localhost:3000'));