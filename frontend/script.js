const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp ' + Number(n).toLocaleString('id-ID');
const notif = (t, m) => { $('#notif').innerHTML = m ? `<div class="${t}">${esc(m)}</div>` : ''; };
const aman = f => (...a) => f(...a).catch(e => notif('err', e.message));

async function api(url, method = 'GET', body) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Terjadi kesalahan.');
  return d;
}


async function dashboard() {
  $('#judul').textContent = 'Dashboard';
  const d = await api('/api/ringkasan');
  $('#isi').innerHTML = `
    <div class="cards">
      <div class="card">Total Siswa<br><b>${d.total}</b></div>
      <div class="card">Belum Pernah Bayar<br><b>${d.belum}</b></div>
      <div class="card">Total Pembayaran<br><b>${rp(d.uang)}</b></div>
    </div>
    <h3>Rekap per Kelas</h3>
    <table><tr><th>Kelas</th><th>Wali Kelas</th><th>Jumlah Siswa</th><th>Total Pembayaran</th></tr>
    ${d.rekap.map(r => `<tr><td>${esc(r.nama_kelas)}</td><td>${esc(r.wali_kelas)}</td><td>${r.jml}</td><td>${rp(r.uang)}</td></tr>`).join('')}
    </table>`;
}


let kelasList = [];
async function siswa() {
  $('#judul').textContent = 'Data Siswa';
  kelasList = await api('/api/kelas');
  $('#isi').innerHTML = `
    <form class="row" onsubmit="cari(event)">
      <input id="q" placeholder="Cari nama / NIS">
      <select id="k"><option value="0">Semua kelas</option>
        ${kelasList.map(k => `<option value="${k.id}">${esc(k.nama_kelas)}</option>`).join('')}</select>
      <button class="btn">Cari</button>
      <button type="button" class="btn" onclick="formSiswa()">+ Tambah</button>
    </form>
    <div id="form"></div><div id="tabel"></div>`;
  await muat();
}
const cari = aman(async e => { e.preventDefault(); notif(); await muat(); });

async function muat() {
  const d = await api(`/api/siswa?q=${encodeURIComponent($('#q').value)}&k=${$('#k').value}`);
  $('#tabel').innerHTML = `<table>
    <tr><th>NIS</th><th>Nama</th><th>JK</th><th>Kelas</th><th>Aksi</th></tr>
    ${d.map(s => `<tr><td>${esc(s.nis)}</td><td>${esc(s.nama)}</td><td>${s.jk}</td><td>${esc(s.nama_kelas)}</td>
      <td><a href="#" onclick="detail(${s.id});return false">Detail</a> |
          <a href="#" onclick="formSiswa(${s.id});return false">Ubah</a> |
          <button class="btn r" onclick="hapus(${s.id})">Hapus</button></td></tr>`).join('')
      || '<tr><td colspan="5">Data tidak ditemukan.</td></tr>'}</table>`;
}

const formSiswa = aman(async id => {
  let s = { nis: '', nama: '', jk: '', tgl_lahir: '', alamat: '', telepon: '', kelas_id: '' };
  if (id) s = await api('/api/siswa/' + id);
  notif();
  $('#form').innerHTML = `<form onsubmit="simpan(event,${id || 0})"><h3>${id ? 'Ubah' : 'Tambah'} Siswa</h3>
    NIS<input id="nis" value="${esc(s.nis)}">
    Nama<input id="nama" value="${esc(s.nama)}">
    Jenis Kelamin<select id="jk"><option value="">-- pilih --</option>
      <option value="L" ${s.jk === 'L' ? 'selected' : ''}>Laki-laki</option>
      <option value="P" ${s.jk === 'P' ? 'selected' : ''}>Perempuan</option></select>
    Tanggal Lahir<input type="date" id="tgl_lahir" value="${esc(s.tgl_lahir)}">
    Alamat<textarea id="alamat">${esc(s.alamat)}</textarea>
    Telepon<input id="telepon" value="${esc(s.telepon)}">
    Kelas<select id="kelas_id"><option value="">-- pilih --</option>
      ${kelasList.map(k => `<option value="${k.id}" ${s.kelas_id == k.id ? 'selected' : ''}>${esc(k.nama_kelas)}</option>`).join('')}</select>
    <button class="btn">Simpan</button> <a href="#" onclick="$('#form').innerHTML='';return false">Batal</a></form>`;
});

const simpan = aman(async (e, id) => {
  e.preventDefault();
  const b = {};
  ['nis', 'nama', 'jk', 'tgl_lahir', 'alamat', 'telepon', 'kelas_id'].forEach(f => b[f] = $('#' + f).value);
  await api(id ? '/api/siswa/' + id : '/api/siswa', id ? 'PUT' : 'POST', b);
  $('#form').innerHTML = '';
  notif('ok', 'Data siswa berhasil disimpan.');
  await muat();
});

const hapus = aman(async id => {
  if (!confirm('Hapus siswa ini?')) return;
  await api('/api/siswa/' + id, 'DELETE');
  notif('ok', 'Data siswa berhasil dihapus.');
  await muat();
});

const detail = aman(async id => {
  const s = await api('/api/siswa/' + id);
  notif();
  $('#form').innerHTML = `<h3>Detail Siswa</h3><table>
    <tr><th>NIS</th><td>${esc(s.nis)}</td></tr><tr><th>Nama</th><td>${esc(s.nama)}</td></tr>
    <tr><th>Jenis Kelamin</th><td>${s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
    <tr><th>Tanggal Lahir</th><td>${esc(s.tgl_lahir)}</td></tr><tr><th>Alamat</th><td>${esc(s.alamat)}</td></tr>
    <tr><th>Telepon</th><td>${esc(s.telepon)}</td></tr><tr><th>Kelas</th><td>${esc(s.nama_kelas)}</td></tr>
    <tr><th>Total Dibayar</th><td>${rp(s.total_dibayar)}</td></tr></table>
    <h4>Riwayat Pembayaran</h4><table><tr><th>Bulan</th><th>Jumlah</th><th>Tanggal</th></tr>
    ${s.pembayaran.map(p => `<tr><td>${esc(p.bulan)}</td><td>${rp(p.jumlah)}</td><td>${esc(p.tgl_bayar)}</td></tr>`).join('')}</table>
    <a href="#" onclick="$('#form').innerHTML='';return false">Tutup</a>`;
});


async function pembayaran() {
  $('#judul').textContent = 'Pembayaran SPP';
  const daftar = await api('/api/siswa?q=&k=0');
  $('#isi').innerHTML = `
    <form onsubmit="bayar(event)"><h3>Input Pembayaran</h3>
      Siswa<select id="siswa_id"><option value="">-- pilih --</option>
        ${daftar.map(s => `<option value="${s.id}">${esc(s.nis + ' - ' + s.nama)}</option>`).join('')}</select>
      Bulan<input id="bulan" placeholder="Contoh: September 2026">
      Jumlah (Rp)<input id="jumlah">
      <button class="btn">Simpan Pembayaran</button></form>
    <h3>Riwayat</h3>
    <form class="row" onsubmit="cariBayar(event)"><input id="qb" placeholder="Cari nama / bulan"><button class="btn">Cari</button></form>
    <div id="riwayat"></div>`;
  await muatBayar();
}
const cariBayar = aman(async e => { e.preventDefault(); notif(); await muatBayar(); });

async function muatBayar() {
  const d = await api('/api/pembayaran?q=' + encodeURIComponent($('#qb').value));
  $('#riwayat').innerHTML = `<table><tr><th>Tanggal</th><th>NIS</th><th>Nama</th><th>Bulan</th><th>Jumlah</th></tr>
    ${d.map(p => `<tr><td>${esc(p.tgl_bayar)}</td><td>${esc(p.nis)}</td><td>${esc(p.nama)}</td><td>${esc(p.bulan)}</td><td>${rp(p.jumlah)}</td></tr>`).join('')
      || '<tr><td colspan="5">Belum ada data.</td></tr>'}</table>`;
}

const bayar = aman(async e => {
  e.preventDefault();
  await api('/api/pembayaran', 'POST', { siswa_id: $('#siswa_id').value, bulan: $('#bulan').value, jumlah: $('#jumlah').value });
  notif('ok', 'Pembayaran berhasil disimpan.');
  $('#bulan').value = ''; $('#jumlah').value = '';
  await muatBayar();
});


const halaman = { dashboard, siswa, pembayaran };
function rute() {
  notif();
  document.querySelectorAll('nav a').forEach(a =>
    a.classList.toggle('aktif', a.getAttribute('href') === (location.hash || '#dashboard')));
  (halaman[location.hash.slice(1)] || dashboard)().catch(e => notif('err', e.message));
}
window.onhashchange = rute;
rute();