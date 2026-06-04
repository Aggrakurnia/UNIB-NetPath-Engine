# UNIB NetPath Engine (Web-GIS Multi-Moda Routing)

**UNIB NetPath Engine** adalah aplikasi Web-GIS navigasi pintar berbasis peta interaktif yang dikembangkan secara khusus untuk membantu civitas akademika serta pengunjung dalam menemukan lintasan terpendek dan paling optimal antar-lokasi di lingkungan Universitas Bengkulu. 

Aplikasi ini mengadopsi pendekatan *Decoupled Full-Stack Architecture* yang memisahkan beban kerja komputasi berat di sisi server (*backend*) dengan antarmuka dinamis di sisi klien (*frontend*). Sistem tidak hanya menyajikan visualisasi rute konvensional, melainkan mengintegrasikan kecerdasan buatan berbasis graf untuk menghitung metrik kesehatan, lingkungan, dan panduan teks secara *real-time*.


## Fitur Utama & Penjelasan Sistem

### 1. Optimasi Rute Berbasis Algoritma A* (A-Star)
Berbeda dengan sistem pencarian buta (*blind search*) seperti algoritma Dijkstra konvensional yang mengevaluasi simpul graf secara radial ke segala arah, **UNIB NetPath Engine** memanfaatkan algoritma cerdas A* dengan rumus evaluasi fungsional:
$$f(n) = g(n) + h(n)$$

* `g(n)`: Jarak nyata antar-ruas jalan di dalam jaringan kampus Universitas Bengkulu (dalam satuan meter).
* `h(n)`: Fungsi heuristik berbasis *Euclidean Distance* yang menghitung sisa jarak udara garis lurus dari simpul aktif yang sedang dievaluasi langsung menuju koordinat absolut simpul tujuan.
Fungsi heuristik ini bertindak sebagai kompas matematis yang memangkas jumlah simpul yang dikunjungi (*visited nodes*) di dalam memori server, sehingga waktu respons komputasi (*execution time*) berjalan sangat instan di bawah **150 milidetik**.

### 2. Logika Multi-Moda Transportasi (*Dynamic Graph Pruning*)
Sistem mampu beradaptasi secara cerdas terhadap aturan regulasi akses jalan raya kampus. Melalui pemanfaatan pustaka `NetworkX` pada sisi server, sistem akan melakukan manipulasi bobot graf secara dinamis berdasarkan parameter input pilihan moda pengguna:
* **Moda Jalan Kaki:** Sistem membuka hak akses seluruh busur graf bertipe pedestrian (`footway`, `pedestrian`, serta jalur trotoar taman tengah rektorat) serta mengabaikan aturan pembatasan searah (*one-way*).
* **Moda Motor / Mobil:** Sistem mengeksekusi fungsi pemotongan graf (*graph pruning*) dengan memberikan penalti nilai bobot tak terhingga (\infty) pada seluruh segmen jalur pejalan kaki, sehingga algoritma dipaksa melakukan kalkulasi ulang untuk mencari rute memutar yang legal bagi kendaraan bermotor melalui aspal koridor utama.

###  3. Transformasi Manifes Navigasi (*Turn-by-Turn*)
Sistem memiliki kemampuan mentransformasikan struktur topologi data geometri graf spasial (array koordinat *Latitude* dan *Longitude*) menjadi instruksi tekstual bahasa manusia yang humanis. Algoritma khusus akan menghitung selisih sudut arah jalan (*azimuth*) antar-segmen busur jalan secara runut:
* Jika perubahan sudut bernilai positif di atas ambang batas toleransi derajat, sistem otomatis melahirkan string instruksi `"Belok Kanan"`.
* Jika perubahan sudut bernilai negatif, sistem memicu string instruksi `"Belok Kiri"`.
* Setiap langkah navigasi dilengkapi dengan akumulasi hitungan sisa jarak meter yang presisi (misal: *"Setelah 79m, belok kanan"*).

### 4. Kalkulasi Metrik Edukasi Lingkungan & Kesehatan
Sebagai instrumen digital pendukung gerakan *Green Campus* Universitas Bengkulu, aplikasi melakukan konversi data spasial jarak nyata menjadi metrik edukatif non-spasial yang interaktif:
* **Metrik Kalori:** Menggunakan konstanta pengeluaran energi metabolik moderat tubuh manusia (0.05 kcal/meter) untuk mengalkulasi estimasi kalori tubuh yang terbakar selama berjalan kaki.
* **Metrik Emisi CO₂:** Menggunakan pengali emisi rata-rata kendaraan roda dua (0.1  gram CO2/meter) pada kecepatan rendah kampus (25km/jam) untuk mengedukasi pengguna mengenai dampak jejak karbon yang dihasilkan jika berkendara di area internal kampus.

## Tech Stack & Arsitektur Perangkat Lunak

### Sisi Server (Backend Component)
* **Python (Flask Framework):** Bertindak sebagai penyedia layanan RESTful API utama sekaligus otak pengolah instruksi *routing engine*.
* **OSMnx:** Digunakan untuk menginisialisasi, mengunduh, dan mengekstrak data koordinat spasial kawasan Universitas Bengkulu langsung dari database OpenStreetMap.
* **NetworkX:** Digunakan untuk memodelkan topologi jaringan jalan internal kampus ke dalam bentuk struktur data graf berarah (G = (V, E)) serta mengeksekusi komputasi pencarian lintasan terpendek.

### Sisi Klien (Frontend Component)
* **HTML5 & CSS3:** Membentuk struktur dan tata letak visual komponen antarmuka dengan tema *Futuristic Dark Mode* ergonomis untuk mereduksi tingkat kelelahan pada mata pengguna.
* **Vanilla JavaScript:** Menangani manajemen *state* aplikasi secara dinamis, menangkap parameter input menu kontrol, mengeksekusi asynchronous Fetch API, serta mengolah data pertukaran *response* JSON.
* **Leaflet.js:** Library peta interaktif untuk merender peta dasar (*base map*), penanda lokasi (*markers*), serta menggambar garis vektor rute (*polyline*) neon di atas kanvas peta secara responsif.

## Struktur API (Application Programming Interface)
Sistem menjamin kelancaran komunikasi data antarmuka menggunakan format pertukaran data JSON melalui metode `HTTP POST` / `HTTP GET` dengan spesifikasi struktur payload sebagai berikut:

 ### Endpoint: `/api/v1/route`
**Request Payload (JSON):**
```json
{
  "starting_point": [-3.7554, 102.2743],
  "destination_point": [-3.7592, 102.2781],
  "transport_mode": "motorcycle"
}
