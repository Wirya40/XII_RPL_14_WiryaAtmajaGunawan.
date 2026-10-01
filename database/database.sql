CREATE DATABASE IF NOT EXISTS db_siswa CHARACTER SET utf8mb4;
USE db_siswa;

DROP TABLE IF EXISTS pembayaran;
DROP TABLE IF EXISTS siswa;
DROP TABLE IF EXISTS kelas;

CREATE TABLE kelas(
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_kelas VARCHAR(30) NOT NULL UNIQUE,
  wali_kelas VARCHAR(100) NOT NULL
);

CREATE TABLE siswa(
  id INT AUTO_INCREMENT PRIMARY KEY,
  nis VARCHAR(10) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  jk ENUM('L','P') NOT NULL,
  tgl_lahir DATE NOT NULL,
  alamat TEXT,
  telepon VARCHAR(14),
  kelas_id INT NOT NULL,
  total_dibayar DECIMAL(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY(kelas_id) REFERENCES kelas(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE pembayaran(
  id INT AUTO_INCREMENT PRIMARY KEY,
  siswa_id INT NOT NULL,
  bulan VARCHAR(20) NOT NULL,
  jumlah DECIMAL(12,2) NOT NULL,
  tgl_bayar DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(siswa_id) REFERENCES siswa(id) ON DELETE RESTRICT
);

INSERT INTO kelas(nama_kelas,wali_kelas) VALUES
('XII RPL 1','Bu Sari'),('XII RPL 2','Pak Budi'),('XII TKJ 1','Bu Rina');

INSERT INTO siswa(nis,nama,jk,tgl_lahir,alamat,telepon,kelas_id,total_dibayar) VALUES
('10001','Ahmad Fauzi','L','2008-03-12','Jl. Merdeka 1','081200000001',1,300000),
('10002','Budi Santoso','L','2008-05-20','Jl. Melati 2','081200000002',1,0),
('10003','Citra Lestari','P','2008-01-08','Jl. Mawar 3','081200000003',1,150000),
('10004','Dewi Anggraini','P','2008-07-15','Jl. Kenanga 4','081200000004',2,0),
('10005','Eko Prasetyo','L','2007-11-30','Jl. Anggrek 5','081200000005',2,0),
('10006','Fitri Handayani','P','2008-09-02','Jl. Dahlia 6','081200000006',2,0),
('10007','Gilang Ramadhan','L','2008-02-18','Jl. Cempaka 7','081200000007',3,0),
('10008','Hana Permata','P','2008-04-25','Jl. Flamboyan 8','081200000008',3,0),
('10009','Indra Wijaya','L','2007-12-11','Jl. Teratai 9','081200000009',3,0),
('10010','Joko Susilo','L','2008-06-06','Jl. Kamboja 10','081200000010',1,0),
('10011','Kirana Putri','P','2008-08-19','Jl. Sakura 11','081200000011',2,0),
('10012','Lukman Hakim','L','2008-10-27','Jl. Bougenville 12','081200000012',3,0);

INSERT INTO pembayaran(siswa_id,bulan,jumlah) VALUES
(1,'Juli 2026',150000),(1,'Agustus 2026',150000),(3,'Juli 2026',150000);