# Product Requirements Document (PRD)

# Portal Project FO

**Version:** 1.1.0
**Status:** Draft / Revised
**Product Name:** Portal Project FO

---

# 1. Product Overview

## 1.1 Deskripsi

**Portal Project FO** adalah aplikasi web internal untuk mengelola, memvalidasi, mereview, menyetujui, dan memonitor pengajuan proyek Fiber Optic (FO).

Setiap Project FO terdiri dari minimal:

1. File **BoQ Excel**
2. File **Geomap KMZ**

Sistem akan membaca kedua file tersebut dan melakukan cross-check otomatis.

Cross-check utama:

```text
BoQ
 │
 ├── Item Code
 ├── Item Description
 ├── Quantity
 ├── Unit
 └── Price
        │
        ▼
     KHS Master
        │
        ├── Item Code
        ├── Description
        └── Price


KMZ
 │
 ├── Point
 ├── LineString
 └── Route
        │
        ▼
    Route Length
        │
        ▼
       BoQ
```

---

# 2. Sample Data yang Digunakan

PRD ini telah disesuaikan dengan sample file yang diberikan.

## 2.1 Sample KHS

File:

```text
AcuanKHSSMUO.xlsx
```

Memiliki sheet:

```text
KHS
PenamaanBOQ
```

### Sheet KHS

Struktur aktual:

| Column       | Description    |
| ------------ | -------------- |
| ItemCategory | Kategori item  |
| ProductNo    | Kode item      |
| ProductDesc  | Deskripsi item |
| ItemPrice    | Harga item     |

Contoh:

| ItemCategory | ProductNo      | ProductDesc                                                                                   | ItemPrice |
| ------------ | -------------- | --------------------------------------------------------------------------------------------- | --------: |
| MATERIAL     | KHS_SMUO_001_M | Pengadaan dan pemasangan Kabel ADSS Fiber Optik Single Mode 12 core G 652 D pada duct / tanam |      8200 |
| SERVICE      | KHS_SMUO_001_S | Pengadaan dan pemasangan Kabel ADSS Fiber Optik Single Mode 12 core G 652 D pada duct / tanam |      4600 |
| MATERIAL     | KHS_SMUO_002_M | Pengadaan dan pemasangan Kabel ADSS Fiber Optik Single Mode 24 core G 652 D pada duct / tanam |      9800 |

### Important Rule

**ProductNo merupakan identifier utama item.**

Contoh:

```text
KHS_SMUO_001_M
```

digunakan untuk mencocokkan item BoQ dengan KHS.

---

# 3. KHS Master Structure

Database KHS harus mengikuti struktur file aktual.

## KHS Item

```text
ItemCategory
ProductNo
ProductDesc
ItemPrice
```

Contoh:

```text
ItemCategory = MATERIAL
ProductNo    = KHS_SMUO_001_M
ProductDesc  = Kabel ADSS FO Single Mode 12 Core
ItemPrice    = 8200
```

---

# 4. Penamaan Project / BoQ

Sample KHS juga memiliki sheet:

```text
PenamaanBOQ
```

Sheet ini berisi contoh format nama project.

Contoh:

```text
[PASANG_BARU AKSES FIBER_OPTIC PANJANG_JALUR 300 M]
2012345678 BANK MANDIRI
Jl. SUDIRMAN MALANG
```

Contoh lainnya:

```text
[GANGGUAN AKSES FIBER_OPTIC PANJANG_JALUR 300 M]
2012345678 BANK MANDIRI
Jl. SUDIRMAN SURABAYA
```

Contoh:

```text
[PERLUASAN_COVERAGE BACKBONE FIBER_OPTIC PANJANG_JALUR 1000 M]
SEGMENT DENPASAR - TABANAN BALI
```

---

# 5. Project Name Parser

Karena panjang jalur dan informasi project dapat terdapat di nama BoQ/order, sistem harus menyediakan parser untuk membaca informasi dari nama project.

Contoh:

```text
[PASANG_BARU AKSES FIBER_OPTIC PANJANG_JALUR 300 M]
2012345678 BANK MANDIRI
Jl. SUDIRMAN MALANG
```

Sistem dapat mencoba mengekstrak:

```text
Project Type
= PASANG_BARU

Network Type
= AKSES FIBER_OPTIC

Proposed Length
= 300 M

Customer
= BANK MANDIRI

Location
= MALANG
```

---

# 6. Project Information

Project memiliki struktur:

```text
Project
│
├── Project Code
├── Project Name
├── Project Type
├── Customer
├── Province
├── City
├── Address
├── Proposed Length
├── BoQ File
├── KMZ File
├── Total Project Value
├── Validation Result
├── Review Status
└── Creator
```

Tidak semua informasi harus selalu berhasil diekstrak otomatis.

Jika parser tidak menemukan data tertentu, admin/user dapat mengoreksinya secara manual.

---

# 7. KMZ Sample Analysis

Sample KMZ:

```text
BOQ CATUR MITRA SEJATI SENTOSA 2026509882.kmz
```

berisi beberapa Placemark.

## Objects

```text
Splitter Level 1 Eksisting
        → Point

JB Eksisting
        → Point

Jalur Kabel KU Eksisting
        → LineString

Splitter Level 2
        → Point

Jaliur kabel dropcore
        → LineString

CATUR MITRA SEJATI SENTOSA 2026509882
        → Point
```

---

# 8. KMZ Parser Requirement

Sistem **tidak boleh hanya membaca satu geometry dari KMZ**.

Sistem harus membaca semua Placemark dan mengklasifikasikan geometry.

Jenis geometry minimal:

```text
Point
LineString
Polygon
MultiGeometry
```

Untuk Project FO, fokus utama adalah:

```text
LineString
```

karena digunakan untuk menghitung panjang jalur.

---

# 9. KMZ Object Structure

Setiap object KMZ harus disimpan sebagai:

```text
KMZ Object
│
├── Name
├── Type
├── Coordinates
├── Geometry
├── Calculated Length
└── Description
```

Contoh:

```text
Name:
Jalur Kabel KU Eksisting

Type:
LineString

Length:
205.48 meter
```

---

# 10. KMZ Point Handling

Point tidak dihitung sebagai panjang jalur.

Contoh:

```text
Splitter Level 1 Eksisting
```

merupakan Point.

Sistem menyimpan:

```text
latitude
longitude
name
type = POINT
```

Point dapat digunakan sebagai informasi GIS.

Contoh:

```text
Splitter
JB
Customer
Node
ODP
ODC
```

---

# 11. KMZ LineString Handling

LineString digunakan untuk perhitungan route length.

Contoh sample:

```text
Jalur Kabel KU Eksisting
≈ 205.48 meter
```

dan:

```text
Jaliur kabel dropcore
≈ 180.36 meter
```

Sistem harus menyimpan panjang masing-masing LineString.

---

# 12. Route Calculation

Panjang LineString dihitung dari koordinat.

Contoh:

```text
Point A
 ↓
Point B
 ↓
Point C
 ↓
Point D
```

Sistem menghitung:

```text
Distance A-B
+
Distance B-C
+
Distance C-D
=
Total Route Length
```

Perhitungan menggunakan jarak geodesic berdasarkan latitude dan longitude.

---

# 13. Multiple Route Handling

Ini merupakan requirement penting berdasarkan sample KMZ.

Satu KMZ dapat memiliki lebih dari satu LineString.

Contoh:

```text
KMZ
│
├── Jalur Kabel KU Eksisting
│       └── 205.48 m
│
└── Jaliur kabel dropcore
        └── 180.36 m
```

Sistem **tidak boleh otomatis menjumlahkan seluruh LineString tanpa konteks**.

Sistem harus menampilkan:

```text
Route Objects

1. Jalur Kabel KU Eksisting
   205.48 m

2. Jaliur kabel dropcore
   180.36 m
```

Kemudian sistem dapat menyediakan:

```text
Included in Validation
[✓] Jalur Kabel KU Eksisting
[✓] Jaliur kabel dropcore
```

atau:

```text
Included in Validation
[ ] Jalur Kabel KU Eksisting
[✓] Jaliur kabel dropcore
```

Sehingga admin dapat menentukan route mana yang digunakan untuk validasi.

---

# 14. Route Classification

Sistem harus mencoba mengidentifikasi tipe route berdasarkan nama Placemark.

Contoh:

```text
Jalur Kabel KU Eksisting
```

dapat dikategorikan:

```text
EXISTING
```

Sedangkan:

```text
Jaliur kabel dropcore
```

dapat dikategorikan:

```text
PROPOSED / DROP CORE
```

Namun hasil klasifikasi otomatis harus dapat dikoreksi oleh admin.

---

# 15. Proposed Route vs Existing Route

Ini menjadi bagian penting dari validation engine.

Sistem harus membedakan:

```text
EXISTING ROUTE
```

dengan:

```text
PROPOSED ROUTE
```

Karena route existing belum tentu termasuk panjang kabel baru yang diajukan dalam BoQ.

Contoh:

```text
Existing:
Jalur Kabel KU Eksisting
205.48 m

Proposed:
Jaliur kabel dropcore
180.36 m
```

Maka sistem tidak boleh langsung menyatakan:

```text
Total = 385.84 m
```

tanpa mengetahui apakah kedua route memang termasuk pekerjaan yang diajukan.

---

# 16. BoQ Length Validation

Sistem harus melakukan cross-check:

```text
BoQ Proposed Length
        VS
Selected KMZ Route Length
```

Contoh:

```text
BoQ:
180 M

KMZ:
180.36 M

Difference:
0.36 M
```

---

# 17. Length Tolerance

Tolerance harus configurable.

Contoh default:

```text
±5%
```

Formula:

```text
Difference =
KMZ Length - BoQ Length

Difference Percentage =
ABS(KMZ Length - BoQ Length)
/
BoQ Length
× 100%
```

Contoh:

```text
BoQ = 180 m
KMZ = 180.36 m

Difference = 0.36 m

Difference %
= 0.20%

Result:
MATCH
```

---

# 18. Length Validation Result

Status:

```text
MATCH
MISMATCH
WARNING
```

Contoh:

```text
BoQ Length
180 m

KMZ Length
180.36 m

Difference
0.36 m

Difference %
0.20%

Status
MATCH
```

---

# 19. BoQ Item Validation

Setiap item pada BoQ dicocokkan dengan:

```text
KHS.ProductNo
```

Contoh:

```text
BoQ ProductNo:
KHS_SMUO_001_M

KHS ProductNo:
KHS_SMUO_001_M

Result:
MATCH
```

---

# 20. Price Validation

Contoh:

```text
BoQ:

ProductNo:
KHS_SMUO_001_M

Price:
Rp 8.500


KHS:

ProductNo:
KHS_SMUO_001_M

Price:
Rp 8.200
```

Sistem menghasilkan:

```text
BoQ Price:
8.500

KHS Price:
8.200

Difference:
300

Difference Percentage:
3.66%

Status:
PRICE_DIFFERENCE
```

---

# 21. Item Validation Status

Setiap item memiliki status:

```text
MATCH
PRICE_DIFFERENCE
ITEM_NOT_FOUND
INVALID_ITEM_CODE
```

---

# 22. KHS Category Validation

Karena KHS memiliki:

```text
MATERIAL
SERVICE
```

kategori harus ikut disimpan.

Contoh:

```text
KHS_SMUO_001_M
```

berarti:

```text
Category = MATERIAL
```

Sedangkan:

```text
KHS_SMUO_001_S
```

berarti:

```text
Category = SERVICE
```

Sistem harus mempertahankan informasi category tersebut.

---

# 23. KHS Master Versioning

Setiap upload KHS harus menjadi version baru.

Contoh:

```text
KHS SMUO
│
├── Version 1
├── Version 2
└── Version 3
```

Project harus menyimpan:

```text
khs_version_id
```

yang digunakan saat validation.

Tujuannya agar project lama tidak berubah hasilnya ketika KHS diperbarui.

---

# 24. KHS Upload Validation

Saat admin upload file KHS:

Sistem harus memeriksa:

```text
Sheet KHS tersedia
        ↓
Required columns tersedia
        ↓
ProductNo tidak kosong
        ↓
ItemPrice valid
        ↓
Duplicate ProductNo
        ↓
Import
```

Required columns:

```text
ItemCategory
ProductNo
ProductDesc
ItemPrice
```

---

# 25. Duplicate KHS Item

Jika terdapat:

```text
ProductNo
KHS_SMUO_001_M
```

lebih dari satu kali dalam satu version:

```text
DUPLICATE_ITEM_CODE
```

Sistem harus menolak import atau meminta admin menyelesaikan duplicate tersebut.

---

# 26. Project Total Value

Total nilai project dihitung dari BoQ.

Formula:

```text
Total Item =
Quantity × Unit Price
```

Kemudian:

```text
Project Total =
Σ seluruh item
```

Contoh:

```text
Item A
10 × Rp8.200
= Rp82.000

Item B
5 × Rp500.000
= Rp2.500.000

Project Total
= Rp2.582.000
```

---

# 27. Dashboard Project

Admin melihat seluruh project.

Table:

| Project     | Customer | City | Length | Total Value | Validation | Status  |
| ----------- | -------- | ---- | -----: | ----------: | ---------- | ------- |
| Catur Mitra | ...      | ...  |  180 m |       Rp... | Match      | Pending |

Kolom minimal:

```text
Project Name
Project Code
Customer
Province
City
BoQ Length
KMZ Length
Total Project Value
Validation Status
Review Status
Created By
Created Date
Action
```

---

# 28. Project Detail

Project detail harus memiliki beberapa section.

## Section 1 — Project Information

```text
Project Name
Project Code
Project Type
Customer
Province
City
Address
```

## Section 2 — Files

```text
BoQ
KMZ
```

## Section 3 — BoQ

Menampilkan seluruh item.

## Section 4 — KHS Validation

Menampilkan hasil cross-check item.

## Section 5 — Route Validation

Menampilkan seluruh LineString.

## Section 6 — Map

Menampilkan KMZ.

## Section 7 — Review

```text
Approve
Request Revision
Reject
```

---

# 29. Route Validation Table

Contoh:

| Route                    | Type     |   Length | Included |
| ------------------------ | -------- | -------: | -------- |
| Jalur Kabel KU Eksisting | Existing | 205.48 m | No       |
| Jaliur kabel dropcore    | Proposed | 180.36 m | Yes      |

Kemudian:

```text
Selected Route Length
= 180.36 m

BoQ Length
= 180 m

Difference
= 0.36 m
```

---

# 30. Map Visualization

Map harus dapat menampilkan:

### Point

```text
Splitter
JB
Customer
Node
```

### Line

```text
Existing Route
Proposed Route
Drop Core
```

Setiap geometry dapat memiliki warna/style berbeda berdasarkan type.

Contoh konsep:

```text
Existing Route
→ style existing

Proposed Route
→ style proposed

Point
→ marker
```

Warna final dapat ditentukan pada tahap UI design.

---

# 31. Dashboard Geomap

Dashboard Geomap hanya menampilkan:

```text
review_status = APPROVED
```

Data yang ditampilkan:

```text
Project
Customer
Province
City
Total Value
Route
Length
```

---

# 32. Geomap Interaction

Ketika user/admin klik route:

```text
Route
 ↓
Popup
 ↓
Project Information
 ↓
Open Project Detail
```

Ketika klik project marker:

```text
Project Marker
 ↓
Project Name
Customer
City
Total Value
Length
 ↓
View Project
```

---

# 33. Reports

Dashboard Reports menampilkan:

```text
Total Project
Total Project Value
Approved
Pending Review
Request Revision
Rejected
```

Filter:

```text
Date
Province
City
Project Type
Status
```

---

# 34. Project Type

Project Type dapat berasal dari informasi project/BoQ.

Contoh dari sample:

```text
PASANG_BARU
GANGGUAN
MUTASI
RELOKASI
PERLUASAN_COVERAGE
RELOKASI_BACKBONE
ADD_ON
PREVENTIVE_MAINTENANCE
```

Nilai tersebut sebaiknya disimpan sebagai master/configuration agar dapat bertambah.

---

# 35. User Role

## ADMIN

Admin dapat:

* Melihat seluruh project.
* Review seluruh project.
* Approve.
* Request Revision.
* Reject.
* Melihat seluruh Geomap approved.
* Melihat Reports.
* Mengelola KHS.
* Mengelola user.
* Melihat audit log.

## USER

User dapat:

* Login.
* Change password.
* Upload project.
* Melihat project sendiri.
* Melihat validation sendiri.
* Melihat status review.
* Melakukan revisi.

---

# 36. Database Schema Revised

## users

```text
id
username
full_name
email
address
password_hash
role
must_change_password
is_active
created_at
updated_at
```

---

## projects

```text
id
project_code
project_name
project_type
customer
province
city
address

boq_proposed_length
kmz_selected_length
length_difference
length_difference_percentage

total_project_value

validation_status
review_status

created_by
current_khs_version_id

created_at
updated_at
```

---

## project_files

```text
id
project_id
file_type
original_filename
stored_filename
storage_path
mime_type
file_size
uploaded_by
created_at
```

File type:

```text
BOQ
KMZ
```

---

## boq_items

```text
id
project_id
item_category
product_no
product_desc
quantity
unit
unit_price
total_price
created_at
```

---

## kmz_objects

```text
id
project_id
name
geometry_type
route_type
coordinates
calculated_length
description
is_selected_for_validation
created_at
```

Geometry type:

```text
POINT
LINESTRING
POLYGON
MULTIGEOMETRY
```

Route type:

```text
EXISTING
PROPOSED
DROP_CORE
UNKNOWN
```

---

## khs_versions

```text
id
version_name
description
effective_date
uploaded_by
is_active
created_at
```

---

## khs_items

```text
id
khs_version_id
item_category
product_no
product_desc
item_price
created_at
updated_at
```

---

## item_validation_results

```text
id
project_id
boq_item_id
khs_item_id

boq_price
khs_price

price_difference
price_difference_percentage

status
message

created_at
```

---

## route_validation_results

```text
id
project_id

boq_length
kmz_length

difference
difference_percentage
tolerance_percentage

status

created_at
```

---

## project_reviews

```text
id
project_id
reviewer_id
action
comment
created_at
```

Action:

```text
APPROVE
REQUEST_REVISION
REJECT
```

---

## audit_logs

```text
id
user_id
action
entity_type
entity_id
metadata
created_at
```

---

# 37. Important Database Requirement

Karena aplikasi menggunakan GIS data, PostgreSQL sebaiknya menggunakan:

```text
PostgreSQL
+
PostGIS
```

PostGIS direkomendasikan untuk menyimpan geometry KMZ.

Contoh:

```text
geometry
GEOMETRY
SRID 4326
```

Dengan demikian route dapat digunakan untuk:

* Map rendering.
* Spatial query.
* Length calculation.
* Geographic filtering.
* Future GIS analysis.

---

# 38. Revised Architecture

```text
                    React.js
                       │
                       ▼
                  Node.js API
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
       PostgreSQL    PostGIS      File Storage
          │
          │
          ├── Projects
          ├── BoQ
          ├── KHS
          ├── Validation
          ├── Reviews
          └── Audit Log
```

---

# 39. Validation Engine

Validation Engine harus terdiri dari:

```text
validation/
│
├── boq/
│   └── boq-parser
│
├── kmz/
│   └── kmz-parser
│
├── khs/
│   └── khs-matcher
│
├── length/
│   └── route-validator
│
├── price/
│   └── price-validator
│
└── project/
    └── project-validation
```

---

# 40. Validation Sequence

Ketika project diupload:

```text
1. Validate Files
        ↓
2. Parse BoQ
        ↓
3. Parse KMZ
        ↓
4. Detect Project Information
        ↓
5. Detect KMZ Objects
        ↓
6. Calculate Route Length
        ↓
7. Match BoQ Items with KHS
        ↓
8. Compare Prices
        ↓
9. Compare BoQ Length vs Selected KMZ Length
        ↓
10. Generate Validation Result
        ↓
11. PENDING REVIEW
```

---

# 41. Validation Summary

Contoh UI:

```text
PROJECT VALIDATION
────────────────────────────

BoQ vs KMZ

BoQ Length
180.00 m

KMZ Length
180.36 m

Difference
0.36 m

Difference %
0.20%

✓ MATCH
```

---

```text
KHS VALIDATION
────────────────────────────

Total Items
25

Matched
21

Price Difference
3

Item Not Found
1
```

---

# 42. Overall Validation

Overall result tidak hanya menggunakan satu kondisi.

Contoh:

```text
Length:
MATCH

KHS:
WARNING

Overall:
WARNING
```

Jika terdapat item yang tidak ditemukan:

```text
Length:
MATCH

KHS:
ERROR

Overall:
ERROR
```

---

# 43. Review Rule

Admin tetap memiliki keputusan final.

Validation engine hanya memberikan informasi.

Contoh:

```text
AUTOMATIC VALIDATION

Length:
MATCH

KHS:
WARNING

Price Difference:
3 items

Item Not Found:
1 item
```

Admin dapat melakukan review berdasarkan hasil tersebut.

---

# 44. Revision Workflow

Jika:

```text
REQUEST_REVISION
```

admin wajib memberikan comment.

Contoh:

```text
"Panjang jalur pada BoQ 180 meter,
sedangkan route yang dipilih pada KMZ 210 meter.
Mohon periksa kembali BoQ dan KMZ."
```

User dapat upload revisi.

Revision tidak menghapus histori sebelumnya.

---

# 45. File Versioning

Jika user melakukan revisi:

```text
Project
│
├── Revision 1
│   ├── BoQ
│   └── KMZ
│
├── Revision 2
│   ├── BoQ
│   └── KMZ
│
└── Revision 3
    ├── BoQ
    └── KMZ
```

Sistem harus menyimpan histori.

---

# 46. Development Phases

## PHASE 0 — Foundation

* React
* Node.js
* PostgreSQL
* PostGIS
* Docker
* Git
* Environment

---

## PHASE 1 — Authentication

* Login
* JWT
* Roles
* Change password
* User management

---

## PHASE 2 — Project Upload

* Project form
* BoQ upload
* KMZ upload
* File validation
* Storage

---

## PHASE 3 — Real BoQ Parser (✅ Complete)

Menggunakan file sampel BoQ Excel (generate dari test scripts) untuk ekstraksi metadata:

```text
Parser:
  Extract Excel → Read Sheet → Find Header Row → Find Project Name
  → Extract Items [product_no, product_desc, quantity, unit, unit_price, total_price]
  → Calculate Total Value
```

Endpoint: `POST /api/projects/parse` — uploads BoQ + KMZ simultaneously, returns ekstraksi otomatis termasuk geocoding via Nominatim.

**Verified dengan sample data:** 8 items terparse, project_name terdeteksi, panjang 180m, total value 1,040,700.

### 3.1 KHS Structure

KHS Master (`AcuanKHSSMUO.xlsx`) memiliki sheet **KHS** dengan kolom:

| Column         | Description    |
|----------------|----------------|
| ItemCategory   | Kategori item (MATERIAL / SERVICE) |
| ProductNo      | Kode item (contoh: `KHS_SMUO_001_M`) — identifier utama |
| ProductDesc    | Deskripsi item |
| ItemPrice      | Harga item |

**Catatan:** `ProductNo` merupakan identifier utama item, digunakan untuk mencocokkan item BoQ dengan KHS.

### 3.2 KHS Parser (✅ Complete)

Membaca file KHS (.xlsx) dan mengekstrak:

```text
- khsItems [item_category, product_no, product_desc, item_price]
- totalItems, materialCount, serviceCount
- hasSheetKHS (validasi sheet mengandung "KHS")
- Validation: duplicate ProductNo, ItemCategory MATERIAL/SERVICE, ProductNo tidak kosong
```

Endpoint: `POST /api/projects/parse-khs` (uploads KHS file)

### 3.3 Validation Engine (✅ Complete)

```text
BoQ vs KHS:
  - Match by ProductNo
  - Compare BoQ unit_price vs KHS item_price
  - Status: MATCH / BOQ_HIGHER / BOQ_LOWER / NOT_FOUND_IN_KHS
  - Stats: totalCompared, matched, boqHigher, boqLower

BoQ vs KMZ:
  - Compare boq_proposed_length vs kmz_total_route_length
  - Tolerance: 5% difference allowed
```

Endpoint: `POST /api/projects/validate` (uploads BoQ + KHS + KMZ)

---

## PHASE 5 — KMZ Parser (✅ Complete)

Parser mampu mengekstrak semua jenis geometry dari file KMZ:

```text
Extract KMZ
  ↓
Read KML (via JSZip + fast-xml-parser)
  ↓
Find Placemark (recursively in Folders)
  ↓
Detect Geometry:
  - POINT → { lat, lon, alt }
  - LINESTRING → coordinates array + haversine length
  - POLYGON → coordinates array (outer boundary)
  - MULTIGEOMETRY → nested Points/LineStrings/Polygons
  ↓
Calculate LineString Length
  ↓
Classify Route:
  - EXISTING (eksisting/existing)
  - PROPOSED (proposed/usul/baru)
  - DROP_CORE (dropcore/drop)
  - UNKNOWN
```

**Service:** `backend/src/services/kmzParser.js`
- Functions: `parseKmz()`, `extractFirstCoordinate()`, `classifyRoute()`, `calculateLineStringLength()`, `haversineDistance()`
- Returns: `objects[]`, `totalObjects`, `points[]`, `lineStrings[]`, `polygons[]`

Verified with test KMZ containing Point, LineString, and Polygon — all 3 geometry types parsed correctly.

---

## PHASE 6 — Validation Engine (✅ Complete)

Implement:

```text
BoQ vs KHS
BoQ Price vs KHS Price
BoQ Length vs KMZ Length
```

---

## PHASE 7 — Admin Review (✅ Complete)

Implement:

```text
Approve
Request Revision
Reject
```

Endpoint: `POST /api/projects/:id/review` (admin only)

```json
{
  "review_status": "APPROVED" | "REVISION" | "REJECTED",
  "notes": "optional comment"
}
```

Database:
- Updates `projects.review_status` and `projects.validation_status`
- Inserts into `project_reviews` table (id, project_id, admin_id, action, comment, created_at)

**Verified:** Approve works, prevents re-approval, blocks non-admin users, validates inputs.

---

## PHASE 8 — Project Dashboard (✅ Complete)

Implement:

* **Search** — Search by project_code, project_name, or customer
* **Filter** — Filter by review_status (PENDING_REVIEW, APPROVED, REVISION, REJECTED)
* **Pagination** — Page navigation (Previous/Next)
* **Project detail** — View project information, validation results, files
* **Validation detail** — Shows validation status, review status, proposed length, KMZ route length, difference %, total value
* **Review** — Admin-only review actions (Approve/Request Revision/Reject)

### Frontend Pages

**`MyProjects.jsx`** — Dashboard with:
- Search bar (live filtering)
- Status filter dropdown
- Pagination controls (Previous/Next)
- Project table: Name, Customer, Value, Validation status, Review status, Submitted date
- Status badges with color coding

**`ProjectDetail.jsx`** — Enhanced detail page:
- Project information card (code, name, type, customer, location, address, created by)
- Validation Results card (validation status, review status, lengths, value)
- Files list with download buttons
- Admin Review section (Approve/Revision/Reject with notes) — visible to admin only
- **KMZMap integration** — Interactive map showing project routes

**`KMZMap.jsx`** — Interactive map component:
- React Leaflet with OpenStreetMap tiles
- Renders Points (circle markers), LineStrings (polylines), Polygons
- Color-coded routes: Blue (Existing), Green (Proposed), Orange (Drop Core), Gray (Unknown)
- Interactive popups with name, type, length
- Legend for route types
- FitBounds auto-zoom to all geometries

### Backend API

`GET /api/projects` — List with search, filter, pagination
`GET /api/projects/:id` — Get project details
`GET /api/projects/:id/kmz` — Get KMZ geometry objects for map rendering
`POST /api/projects/:id/review` — Admin review action

**Installed:** `react-leaflet` and `leaflet` packages in frontend

---

## PHASE 9 — User Dashboard (✅ Complete)

Implement:

* **My Projects** — Dashboard with project listing, search, filter, pagination
* **Project status** — Review status (PENDING_REVIEW, APPROVED, REVISION, REJECTED) + Validation status (PENDING, VALIDATED)
* **Validation result** — Shows length comparison, total value, proposed length, KMZ route length
* **Revision** — Revision status visible with warning badge; users can see admin feedback

### Frontend Changes

**`MyProjects.jsx`** — Updated table:
- Separate columns for Validation status and Review status
- Color-coded badges for each status
- Value column with formatted currency (Rp)

**`ProjectDetail.jsx`** — Added Validation Results card:
- Validation status and Review status badges
- Proposed length, KMZ route length, length difference, total project value
- Admin review section with notes for revisions

**`projectUtils.js`** — Added:
- `getValidationStatusColor()` and `getValidationStatusText()` for validation statuses
- Extended `getStatusColor`/`getStatusText` to handle uppercase status values

---

## PHASE 10 — Geomap (✅ Complete)

### 10.1 — KMZ Map Component

Implement:
* React Leaflet
* KMZ routes (LineString, Point, Polygon)
* Project popup
* Project detail

**Key fix:** `KMZMap.jsx` imports `MapContainer`, `useMap` etc. from `'react-leaflet'` (not `'leaflet'` — mixing these causes a blank screen crash).

### 10.2 — Geomap Dashboard

New feature: Interactive map dashboard showing all APPROVED projects.

**Backend:**
- `GET /api/projects/geomap/projects` — Returns all approved projects with coordinates
- Controller: `getApprovedProjectsForGeomap` in `projectController.js`
- Queries `projects` table where `review_status = 'APPROVED'` and `coordinates IS NOT NULL`

**Frontend:**
- `GeomapDashboard.jsx` — New page component
- Route: `/geomap` (added to `App.jsx`)
- Menu: "Geomap Dashboard" (added to admin and user menus in `Layout.jsx`)
- Features:
  - Interactive map with OpenStreetMap tiles
  - Project markers with custom pin icons
  - Click marker → zoom to location + show popup
  - Popup with project name, value, location, status, "View Project" button
  - Sidebar with project list, search, filter (province/city), fit all, clear filters
  - Summary cards (count, total value, provinces)
  - Loading, error, and empty states
  - Responsive layout (sidebar + map on desktop, stacked on mobile)

**Acceptance Criteria (all met):**
* Map displays correctly ✓
* Only APPROVED projects shown ✓
* Click marker focuses map + shows popup ✓
* Popup shows project name + value ✓
* "View Project" navigates to existing detail page ✓
* Project list in sidebar ✓
* Click list item focuses map ✓
* Search by name/code/city/province ✓
* Filter by province and city ✓
* Fit All button ✓
* Loading/error/empty states ✓
* Responsive ✓
* No console errors ✓
* Build succeeds ✓
* All 56 tests pass ✓

---

## PHASE 11 — Reports (✅ Complete)

Implement:

* Project count
* Project value
* Status
* Province
* City
* Date
* Monthly report

**Backend:**
- `GET /api/reports/summary` — Returns project statistics filtered by province, city, type, status, year, month
- Controller: `reportController.js` with `getProjectReports()`
- Returns: summary (count, value, provinces/cities count), status distribution, province distribution, city distribution, monthly trend, project list, filter options
- Route registered at `/api/reports/summary`

**Frontend:**
- `Reports.jsx` — New page component with:
  - Summary cards (total projects, total value, provinces, cities)
  - Filter controls (province, city, project type, review status, year, month)
  - Status distribution list
  - Province distribution with values
  - Monthly trend
  - Project data table with search
  - Loading, error, empty states
  - Responsive layout
- Route: `/reports` (added to App.jsx)
- Menu: "Reports" (added to admin and user menus in Layout.jsx)

**Tests:** 63 total (4 new tests for reports endpoint)

### 11.1 — Centralized Data Management

**Problem:** Dashboard, MyProjects, GeomapDashboard, and Reports pages maintained isolated state. Adding a new project or approving a project did not update other pages.

**Solution:** Created a centralized `ProjectContext` provider.

**Files:**
- `frontend/src/contexts/ProjectContext.jsx` — Shared context with:
  - `projects` state (list, loading, error, pagination)
  - `summary` state (total projects, value, provinces/cities count, status distribution)
  - `geomapProjects` state (approved projects with coordinates for map)
  - `reportsData` state (filtered reports data)
  - `loadProjects()`, `loadProjectSummary()`, `loadGeomapProjects()`, `loadReports()` fetch functions
  - `refreshProjects()` — Dispatches window event to refresh all components
  - Pub/sub pattern: `projects:changed` event for cross-component communication
- `frontend/src/utils/projectUtils.js` — Added `formatCurrency()` utility
- Updated `Dashboard`, `MyProjects`, `GeomapDashboard`, `Reports`, `UploadProject`, `ProjectDetail` to use shared context

**Data Flow:**
1. Project created → `UploadProject` calls `refreshProjects()` → Window event dispatched → All components update
2. Project approved → `ProjectDetail` calls `refreshProjects()` → Same flow applies


---

## PHASE 12 — Audit & Notification

Implement:

* Audit trail
* Activity history
* In-app notification

---

## PHASE 13 — Docker Production

Implement:

```text
Frontend
Backend
PostgreSQL
PostGIS
Storage
Redis (optional)
Nginx
```

---

## PHASE 14 — Testing

Testing:

```text
Unit Test
Integration Test
API Test
Parser Test
GIS Test
Authorization Test
File Security Test
```

---

# 47. MVP Definition

MVP harus dapat melakukan:

```text
LOGIN
  ↓
UPLOAD BOQ
  ↓
UPLOAD KMZ
  ↓
PARSE BOQ
  ↓
PARSE KMZ
  ↓
LOAD KHS
  ↓
MATCH ITEM
  ↓
COMPARE PRICE
  ↓
CALCULATE ROUTE
  ↓
COMPARE LENGTH
  ↓
SHOW RESULT
  ↓
ADMIN REVIEW
  ↓
APPROVE / REVISION / REJECT
```

---

# 48. Critical Requirements

Requirement berikut merupakan **Critical**:

### CR-01

Sistem harus dapat membaca `ProductNo` dari BoQ.

### CR-02

Sistem harus mencocokkan `ProductNo` dengan `KHS.ProductNo`.

### CR-03

Sistem harus membandingkan harga BoQ dengan `KHS.ItemPrice`.

### CR-04

Sistem harus membaca LineString dari KMZ.

### CR-05

Sistem harus menghitung panjang setiap LineString.

### CR-06

Sistem harus dapat membedakan Existing dan Proposed Route.

### CR-07

Sistem tidak boleh menjumlahkan semua LineString secara otomatis tanpa pemilihan/konfirmasi route.

### CR-08

Sistem harus membandingkan selected KMZ route dengan panjang BoQ.

### CR-09

Sistem harus menyimpan geometry KMZ.

### CR-10

Sistem harus menyimpan KHS version yang digunakan ketika validasi.

### CR-11

Admin memiliki keputusan final terhadap approval.

### CR-12

Hanya project APPROVED yang masuk Geomap Dashboard keseluruhan.

---

# 49. Important Sample-Based Behavior

Untuk sample KMZ:

```text
Jalur Kabel KU Eksisting
205.48 m

Jaliur kabel dropcore
180.36 m
```

Portal harus menampilkan kedua route secara terpisah.

Contoh:

```text
KMZ ANALYSIS

┌──────────────────────────────┐
│ Jalur Kabel KU Eksisting    │
│ Type: Existing              │
│ Length: 205.48 m            │
│                             │
│ [ ] Include Validation      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Jaliur kabel dropcore       │
│ Type: Proposed              │
│ Length: 180.36 m            │
│                             │
│ [✓] Include Validation      │
└──────────────────────────────┘
```

Kemudian:

```text
Selected KMZ Length:
180.36 m
```

Jika BoQ:

```text
180 m
```

maka:

```text
Difference:
0.36 m

Difference:
0.20%

Result:
MATCH
```

---

# 50. Final System Flow

```text
                    USER
                      │
                      ▼
                Upload Project
                      │
              ┌───────┴───────┐
              ▼               ▼
             BoQ              KMZ
              │               │
              ▼               ▼
        Parse Excel       Parse KML
              │               │
              │          Detect Geometry
              │               │
              │        ┌──────┴──────┐
              │        ▼             ▼
              │      Point        LineString
              │        │             │
              │        │        Calculate Length
              │        │             │
              └────────┴──────┬──────┘
                               ▼
                       Validation Engine
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              KHS Validation       Route Validation
                    │                     │
                    ▼                     ▼
              Price Check           Length Check
                    │                     │
                    └──────────┬──────────┘
                               ▼
                       Validation Result
                               │
                               ▼
                         ADMIN REVIEW
                               │
                  ┌────────────┼────────────┐
                  ▼            ▼            ▼
               APPROVE      REVISION      REJECT
                  │            │
                  │            ▼
                  │          USER
                  │            │
                  │       Upload Revision
                  │            │
                  │            ▼
                  │       Validate Again
                  │
                  ▼
             APPROVED PROJECT
                  │
          ┌───────┴────────┐
          ▼                ▼
       GEOMAP            REPORTS
```

---

# 51. Future GIS Capability

Karena sistem menggunakan PostGIS, pada tahap selanjutnya dapat dikembangkan:

```text
Route overlap detection
Route proximity analysis
Existing vs proposed comparison
Nearest ODP/ODC
Project clustering
Province/city spatial filtering
Duplicate route detection
```

Fitur tersebut tidak menjadi bagian MVP.

---

# 52. Definition of Done

Feature dianggap selesai apabila:

* Backend selesai.
* Frontend selesai.
* Database migration selesai.
* Authorization selesai.
* Error handling selesai.
* Test selesai.
* Docker dapat menjalankan feature.
* Tidak merusak feature sebelumnya.
* Dokumentasi API diperbarui.

---

# 53. Development Rule

Project harus dikembangkan secara incremental.

```text
PHASE
 ↓
IMPLEMENT
 ↓
TEST
 ↓
REVIEW
 ↓
FIX
 ↓
COMMIT
 ↓
NEXT PHASE
```

Jangan mengimplementasikan seluruh fase sekaligus.

Setiap fase harus dapat diuji sebelum melanjutkan ke fase berikutnya.

---

# 54. Current PRD Status

**Version:** 1.1.0

PRD ini telah disesuaikan dengan:

```text
AcuanKHSSMUO.xlsx
```

dan:

```text
BOQ CATUR MITRA SEJATI SENTOSA 2026509882.kmz
```

Namun, untuk mengunci **BoQ Parser secara final**, masih diperlukan satu contoh **file BoQ Excel transaksi/project yang sebenarnya**, karena file `AcuanKHSSMUO.xlsx` yang tersedia saat ini merupakan file KHS Master dan contoh penamaan BoQ, bukan file BoQ project lengkap.

Setelah contoh BoQ aktual tersedia, struktur:

```text
boq_items
BoQ Parser
Project Name Parser
Quantity Parser
Unit Parser
Price Parser
Total Parser
```

dapat disesuaikan persis dengan format Excel perusahaan.

---
# 55. Design System & UI/UX Requirements

## 55.1 Design Direction

Portal Project FO menggunakan desain yang:

* Professional
* Clean
* Modern
* Minimalist
* Corporate
* Mudah digunakan untuk operasional internal perusahaan
* Responsive
* Menggunakan identitas visual yang terinspirasi dari branding Lintasarta

Primary visual direction:

```text
WHITE + LINTASARTA BLUE
```

Warna utama website menggunakan kombinasi:

```text
White
+
Blue
+
Neutral Gray
```

Desain tidak menggunakan terlalu banyak warna dekoratif.

---

# 55.2 Brand Color

Warna utama website menggunakan warna biru yang mengikuti identitas visual logo Lintasarta.

Gunakan design token sehingga warna dapat diubah secara terpusat.

Contoh:

```text
--color-primary
--color-primary-hover
--color-primary-light
--color-primary-dark

--color-background
--color-surface

--color-text-primary
--color-text-secondary

--color-border

--color-success
--color-warning
--color-danger
--color-info
```

Nilai HEX final harus disesuaikan dengan **brand guideline/logo Lintasarta yang digunakan perusahaan**, bukan dibuat secara bebas.

---

# 55.3 Color Usage

## Primary

Digunakan untuk:

* Sidebar active menu
* Primary button
* Link
* Active tab
* Important action
* Selected state
* Progress indicator

Contoh:

```text
[ + Upload Project ]
```

menggunakan primary blue.

---

## White

Digunakan sebagai:

* Main background
* Card background
* Modal background
* Table background
* Form background

Website harus memiliki tampilan yang dominan putih agar terlihat bersih dan profesional.

---

## Neutral Gray

Digunakan untuk:

* Border
* Divider
* Secondary text
* Disabled component
* Table header
* Background section

---

# 55.4 Status Colors

Warna status digunakan hanya untuk membantu membedakan status.

### APPROVED

Gunakan warna hijau.

```text
APPROVED
```

### PENDING REVIEW

Gunakan warna biru / neutral.

```text
PENDING REVIEW
```

### REQUEST REVISION

Gunakan warna kuning/oranye.

```text
REQUEST REVISION
```

### REJECTED

Gunakan warna merah.

```text
REJECTED
```

### VALIDATION ERROR

Gunakan warna merah.

```text
VALIDATION ERROR
```

### VALIDATION WARNING

Gunakan warna kuning/oranye.

```text
VALIDATION WARNING
```

Status color tidak boleh mengubah warna utama website.

---

# 55.5 Logo

Logo perusahaan dapat ditempatkan pada:

### Login Page

```text
┌─────────────────────────────┐
│                             │
│          LINTASARTA         │
│                             │
│      Portal Project FO      │
│                             │
│       Username              │
│       Password              │
│                             │
│          LOGIN              │
│                             │
└─────────────────────────────┘
```

### Dashboard

Logo ditempatkan pada bagian sidebar/header.

Contoh:

```text
┌──────────────────┐
│    LINTASARTA    │
│                  │
│ Dashboard        │
│ Projects         │
│ Geomap           │
│ Reports          │
│ KHS Master       │
│ Users            │
│                  │
└──────────────────┘
```

Logo tidak boleh dimodifikasi secara sembarangan.

Gunakan file logo resmi yang diberikan perusahaan.

---

# 55.6 Layout

Admin dashboard menggunakan layout:

```text
┌─────────────────────────────────────────────────┐
│ Header                              User Profile │
├───────────────┬─────────────────────────────────┤
│               │                                 │
│ Sidebar       │         Main Content            │
│               │                                 │
│ Dashboard     │                                 │
│ Projects      │                                 │
│ Geomap        │                                 │
│ Reports       │                                 │
│ KHS Master    │                                 │
│ Users         │                                 │
│               │                                 │
│               │                                 │
└───────────────┴─────────────────────────────────┘
```

---

# 55.7 Sidebar

Sidebar menggunakan:

* White atau dark/blue variant yang tetap mengikuti brand color.
* Logo di bagian atas.
* Menu menggunakan icon + text.
* Active menu menggunakan primary blue.
* Hover menggunakan primary light.

Menu Admin:

```text
Dashboard
Projects
Geomap
Reports
KHS Master
Users
Audit Log
Settings
```

Menu User:

```text
My Projects
Upload Project
Profile
```

User tidak boleh melihat menu admin.

---

# 55.8 Dashboard Cards

Dashboard menggunakan card dengan desain sederhana.

Contoh:

```text
┌──────────────────────┐
│ TOTAL PROJECT        │
│                      │
│ 125                  │
│                      │
│ All Projects         │
└──────────────────────┘
```

Card menggunakan:

* White background
* Border atau subtle shadow
* Rounded corners
* Primary blue sebagai accent
* Icon sederhana

---

# 55.9 Project Dashboard UI

Project dashboard menggunakan table modern.

```text
┌──────────────────────────────────────────────────────────────┐
│ Project Dashboard                             + Upload       │
├──────────────────────────────────────────────────────────────┤
│ Search Project...   Province ▼   City ▼   Status ▼          │
├──────────────────────────────────────────────────────────────┤
│ Project      Location     Value       Validation    Status   │
│ ──────────────────────────────────────────────────────────── │
│ Project A    Makassar     Rp500M      MATCH         Approved │
│ Project B    Gowa         Rp250M      WARNING       Pending  │
│ Project C    Maros        Rp100M      MATCH         Revision │
└──────────────────────────────────────────────────────────────┘
```

Table harus mendukung:

* Search
* Filter
* Sort
* Pagination
* View detail

---

# 55.10 Project Detail UI

Project detail menggunakan tab/section.

```text
Project Information
│
├── Overview
├── BoQ
├── KHS Validation
├── Route Validation
├── Geomap
└── Review History
```

---

# 55.11 Validation Result UI

Validation harus mudah dipahami.

Contoh:

```text
┌─────────────────────────────────────────────────┐
│ ROUTE VALIDATION                                │
├─────────────────────────────────────────────────┤
│                                                 │
│ BoQ Length             180.00 m                 │
│ KMZ Length             180.36 m                 │
│ Difference               0.36 m                 │
│ Difference %             0.20%                  │
│                                                 │
│              ✓ MATCH                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

KHS validation:

```text
┌─────────────────────────────────────────────────┐
│ KHS VALIDATION                                  │
├─────────────────────────────────────────────────┤
│ Total Items                 25                  │
│ Matched                     21                  │
│ Price Difference             3                  │
│ Item Not Found               1                  │
│                                                 │
│              ⚠ WARNING                          │
└─────────────────────────────────────────────────┘
```

---

# 55.12 KHS Item Comparison UI

Gunakan table comparison.

```text
┌───────────────────────────────────────────────────────────────┐
│ Item Code       BoQ Price    KHS Price    Difference  Status │
├───────────────────────────────────────────────────────────────┤
│ KHS_001_M       Rp8.500      Rp8.200      Rp300       Warning│
│ KHS_002_M       Rp9.000      Rp9.000      Rp0         Match  │
│ KHS_003_S       Rp5.000      -            -           Error  │
└───────────────────────────────────────────────────────────────┘
```

Perbedaan harga harus mudah terlihat.

---

# 55.13 Geomap UI

Geomap menggunakan area map yang besar.

```text
┌──────────────────────────────────────────────────────┐
│ Geomap                                               │
├──────────────────────────────────────────────────────┤
│                                                      │
│                  MAP                                 │
│                                                      │
│       ●───────────────●                              │
│       │               │                              │
│       │    ROUTE      │                              │
│       │               ●                              │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Project Information                                  │
│ Project: Catur Mitra                                 │
│ Location: Makassar                                   │
│ Length: 180.36 m                                     │
└──────────────────────────────────────────────────────┘
```

Map harus menjadi salah satu elemen utama pada halaman Geomap.

---

# 55.14 Geomap Route Styling

Geometry dapat menggunakan style berdasarkan tipe route:

```text
Existing
Proposed
Drop Core
Other
```

Style harus dapat dibedakan dengan jelas.

Contoh konsep:

```text
Existing Route
──────────────

Proposed Route
══════════════

Drop Core
- - - - - - -
```

Warna final mengikuti design system dan dapat dikonfigurasi.

---

# 55.15 Reports UI

Reports menggunakan:

### KPI Cards

```text
Total Project
Total Value
Approved
Pending
Revision
Rejected
```

### Charts

Minimal:

```text
Project by Status
Project by Province
Project by City
Project Value by Month
```

### Filters

```text
Date Range
Province
City
Status
Project Type
```

---

# 55.16 Upload Project UI

Upload page harus menggunakan multi-step form.

```text
STEP 1
Project Information
       ↓
STEP 2
Upload BoQ
       ↓
STEP 3
Upload KMZ
       ↓
STEP 4
Automatic Validation
       ↓
STEP 5
Review Before Submit
       ↓
SUBMIT
```

---

# 55.17 Upload BoQ Component

Contoh:

```text
┌─────────────────────────────────────────┐
│ Upload BoQ                              │
│                                         │
│       Drag & Drop Excel Here            │
│                                         │
│              or                         │
│                                         │
│          [ Choose File ]                │
│                                         │
│ Supported: .xlsx, .xls                  │
└─────────────────────────────────────────┘
```

Setelah upload:

```text
✓ BOQ CATUR MITRA.xlsx

Size:
2.4 MB

Status:
Ready
```

---

# 55.18 Upload KMZ Component

```text
┌─────────────────────────────────────────┐
│ Upload Geomap                            │
│                                         │
│       Drag & Drop KMZ Here              │
│                                         │
│              or                         │
│                                         │
│          [ Choose File ]                │
│                                         │
│ Supported: .kmz                         │
└─────────────────────────────────────────┘
```

Setelah upload:

```text
✓ project-route.kmz

Status:
Ready
```

---

# 55.19 Automatic Processing UI

Setelah kedua file upload:

```text
Processing Project...

✓ Reading BoQ
✓ Reading KHS
✓ Reading KMZ
✓ Detecting Route
✓ Calculating Route Length
✓ Comparing BoQ & KMZ
✓ Comparing BoQ & KHS

Validation Complete
```

Progress indicator harus ditampilkan kepada user.

---

# 55.20 Review Before Submit

Sebelum project dikirim ke admin:

```text
PROJECT SUMMARY

Project:
CATUR MITRA SEJATI SENTOSA

Location:
Makassar

BoQ Length:
180 m

KMZ Length:
180.36 m

Difference:
0.36 m

KHS:
21 Match
3 Difference
1 Not Found

Total Project Value:
Rp xxx.xxx.xxx

[ Back ]

[ Submit Project ]
```

---

# 55.21 Typography

Gunakan font modern dan mudah dibaca.

Recommended:

```text
Inter
```

Fallback:

```text
system-ui
sans-serif
```

Typography harus memiliki hierarchy:

```text
Page Title
Section Title
Card Title
Body
Caption
Table
```

---

# 55.22 Border Radius

Gunakan radius yang modern namun tidak terlalu rounded.

Recommended:

```text
Small:
6px

Medium:
8px

Large:
12px
```

Hindari penggunaan border radius ekstrem seperti:

```text
50px
```

untuk seluruh component.

---

# 55.23 Shadow

Gunakan shadow secara subtle.

Card tidak perlu memiliki shadow yang terlalu kuat.

Tujuan:

```text
Clean
Professional
Corporate
```

---

# 55.24 Responsive Design

Website harus responsive pada:

```text
Desktop
Laptop
Tablet
Mobile
```

Prioritas utama:

```text
Desktop
Laptop
```

karena aplikasi merupakan aplikasi internal perusahaan.

---

# 55.25 Accessibility

UI harus memperhatikan:

* Kontras warna.
* Keyboard navigation.
* Form labels.
* Button states.
* Error message.
* Loading state.
* Empty state.
* Disabled state.

Jangan menggunakan warna saja untuk menyampaikan status.

Contoh:

```text
✓ MATCH
```

bukan hanya menggunakan warna hijau.

---

# 55.26 Loading State

Setiap proses yang membutuhkan waktu harus memiliki loading state.

Contoh:

```text
Uploading...
Processing...
Validating...
Loading Map...
Generating Report...
```

Gunakan:

* Skeleton
* Spinner
* Progress bar

sesuai konteks.

---

# 55.27 Empty State

Jika user belum memiliki project:

```text
┌─────────────────────────────────┐
│                                 │
│       No Projects Yet           │
│                                 │
│  You haven't submitted any      │
│  Project FO yet.                │
│                                 │
│       [ Upload Project ]         │
│                                 │
└─────────────────────────────────┘
```

---

# 55.28 Error State

Contoh:

```text
Unable to process KMZ file.

Please check that:
• The KMZ file is valid.
• The file is not corrupted.
• The file contains valid geometry.

[ Try Again ]
```

---

# 55.29 Confirmation Modal

Action penting harus menggunakan confirmation modal.

Contoh Reject:

```text
Reject Project?

Project:
CATUR MITRA

Please provide a reason.

[ Cancel ] [ Reject Project ]
```

Approve:

```text
Approve Project?

Are you sure this project has completed
the review process?

[ Cancel ] [ Approve Project ]
```

---

# 55.30 Design Principle

Seluruh halaman harus mengikuti prinsip:

```text
Clean
↓
Simple
↓
Consistent
↓
Professional
↓
Data-focused
```

Website bukan aplikasi consumer/social media.

Fokus utama adalah:

```text
Project
Validation
GIS
Review
Reporting
```

---

# 55.31 UI Priority

Prioritas visual:

### Priority 1

Project Status

### Priority 2

Validation Result

### Priority 3

Project Value

### Priority 4

Location / Geomap

### Priority 5

Project Metadata

---

# 55.32 Design Consistency

Seluruh component harus menggunakan design token.

Jangan melakukan hard-code warna di setiap component.

Contoh yang **tidak diperbolehkan**:

```css
button {
    background: #123456;
}
```

di banyak file.

Gunakan:

```css
var(--color-primary)
```

sehingga branding dapat diubah dari satu tempat.

---

# 55.33 Frontend Design System Structure

Recommended:

```text
src/
└── design-system/
    ├── colors.js
    ├── typography.js
    ├── spacing.js
    ├── shadows.js
    ├── radius.js
    └── components/
        ├── Button
        ├── Card
        ├── Badge
        ├── Table
        ├── Modal
        ├── Input
        ├── Select
        ├── FileUpload
        └── Map
```

---

# 55.34 Design Acceptance Criteria

Frontend dianggap sesuai apabila:

* Dominan putih.
* Primary color menggunakan biru brand Lintasarta.
* Logo perusahaan digunakan dengan benar.
* Sidebar konsisten.
* Button konsisten.
* Status menggunakan badge.
* Table mudah dibaca.
* Map menjadi elemen utama pada Geomap.
* Validation result mudah dipahami.
* Responsive.
* Tidak menggunakan warna yang terlalu banyak.
* Tidak terlihat seperti template dashboard generic.
* Semua halaman menggunakan design token yang sama.

---

# 55.35 Brand Implementation Rule

Logo dan warna resmi perusahaan harus dianggap sebagai **brand asset**.

Jika tersedia:

```text
Lintasarta Brand Guideline
```

maka:

1. Gunakan logo resmi.
2. Gunakan primary blue resmi.
3. Gunakan secondary color resmi.
4. Ikuti aturan clear space logo.
5. Jangan mengubah bentuk logo.
6. Jangan menggunakan warna yang berbeda dari brand guideline untuk elemen brand.

Jika brand guideline belum tersedia, gunakan **white + blue** sebagai design direction dan jadikan nilai warna sebagai configurable design tokens sampai kode warna resmi dikonfirmasi.

---

# 55.36 Overall Visual Concept

Konsep akhir:

```text
┌────────────────────────────────────────────────────────┐
│ LINTASARTA                         Admin ▼             │
├───────────────┬────────────────────────────────────────┤
│               │                                        │
│ Dashboard     │  Portal Project FO                     │
│ Projects      │                                        │
│ Geomap        │  ┌────────┐ ┌────────┐ ┌────────┐    │
│ Reports       │  │Project │ │Approved│ │Pending │    │
│ KHS Master    │  │  125   │ │   80   │ │   25   │    │
│ Users         │  └────────┘ └────────┘ └────────┘    │
│               │                                        │
│               │  Project List                          │
│               │  ┌──────────────────────────────────┐  │
│               │  │ Project | Location | Status       │  │
│               │  │─────────┼──────────┼──────────────│  │
│               │  │ Project A| Makassar| Approved     │  │
│               │  │ Project B| Gowa    | Pending      │  │
│               │  └──────────────────────────────────┘  │
│               │                                        │
└───────────────┴────────────────────────────────────────┘
```

Visual identity:

```text
WHITE
+
LINTASARTA BLUE
+
LIGHT GRAY
+
STATUS COLORS
```

dengan fokus pada **data, validasi, project management, dan GIS**.


# END OF PRD
