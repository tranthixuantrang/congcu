CREATE DATABASE QUANLYSIEUTHIMINI

-- Bảng Danh mục sản phẩm
CREATE TABLE DanhMucSanPham (
    MaDM INT PRIMARY KEY,
    TenDM NVARCHAR(100) NOT NULL
);

-- Bảng Sản phẩm
CREATE TABLE SanPham (
    MaSP INT PRIMARY KEY,
    MaDM INT NOT NULL,
    TenSP NVARCHAR(100) NOT NULL,
    DonGia DECIMAL(18,2) NOT NULL,
    SoLuongTon INT NOT NULL,
    FOREIGN KEY (MaDM) REFERENCES DanhMucSanPham(MaDM)
);

-- Bảng Vai trò
CREATE TABLE VaiTro (
	MaVT INT PRIMARY KEY,
	TenVT NVARCHAR(100)
);

-- Bảng Người dùng
CREATE TABLE NguoiDung (
    MaND INT PRIMARY KEY,
    CCCD NVARCHAR(20) UNIQUE,
    HoTenND NVARCHAR(100) NOT NULL,
    NgaySinh DATE,
    GioiTinh NVARCHAR(10),
    SoDT NVARCHAR(15),
    MaVT INT NOT NULL,
	FOREIGN KEY (MaVT) REFERENCES VaiTro(MaVT)
);

-- Bảng Tài khoản
CREATE TABLE TaiKhoan (
    TenTK NVARCHAR(50) PRIMARY KEY,
    MatKhau NVARCHAR(100) NOT NULL,
    MaND INT NOT NULL,
    FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND)
);

-- Bảng Hóa đơn
CREATE TABLE HoaDon (
    MaHD INT PRIMARY KEY,
    MaND INT NOT NULL,
    NgayTao DATE NOT NULL,
    TongTien DECIMAL(18,2) NOT NULL,
    FOREIGN KEY (MaND) REFERENCES NguoiDung(MaND)
);

-- Bảng Chi tiết hóa đơn
CREATE TABLE ChiTietHoaDon (
    MaHD INT NOT NULL,
    MaSP INT NOT NULL,
    SoLuong INT NOT NULL,
    PRIMARY KEY (MaHD, MaSP),
    FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD),
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP)
);

-- Bảng Phiếu nhập kho
CREATE TABLE PhieuNhapKho (
    MaPhieu INT PRIMARY KEY,
    NgayNhap DATE NOT NULL,
    TongTien DECIMAL(18,2) NOT NULL
);

-- Bảng Chi tiết phiếu nhập
CREATE TABLE ChiTietPhieuNhap (
    MaPhieu INT NOT NULL,
    MaSP INT NOT NULL,
    GiaNhap DECIMAL(18,2) NOT NULL,
    SoLuong INT NOT NULL,
    PRIMARY KEY (MaPhieu, MaSP),
    FOREIGN KEY (MaPhieu) REFERENCES PhieuNhapKho(MaPhieu),
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP)
);
