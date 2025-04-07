/**
 * File terjemahan untuk standarisasi bahasa Indonesia di seluruh aplikasi
 */

export const messages = {
  // Pesan sukses
  success: {
    // Umum
    saved: 'Berhasil disimpan',
    updated: 'Berhasil diperbarui',
    deleted: 'Berhasil dihapus',
    archived: 'Berhasil diarsipkan',
    restored: 'Berhasil dipulihkan',
    
    // Transaksi
    transactionAdded: 'Transaksi berhasil ditambahkan',
    transactionUpdated: 'Transaksi berhasil diperbarui',
    transactionDeleted: 'Transaksi berhasil dihapus',
    
    // Pengeluaran
    expenseAdded: 'Pengeluaran berhasil ditambahkan',
    expenseUpdated: 'Pengeluaran berhasil diperbarui',
    expenseDeleted: 'Pengeluaran berhasil dihapus',
    
    // Inventaris
    inventoryAdded: 'Inventaris berhasil ditambahkan',
    inventoryUpdated: 'Inventaris berhasil diperbarui',
    inventoryDeleted: 'Inventaris berhasil dihapus',
    inventoryArchived: 'Inventaris berhasil diarsipkan',
    inventoryRestored: 'Inventaris berhasil dipulihkan',
    
    // Langganan
    subscriptionAdded: 'Langganan berhasil ditambahkan',
    subscriptionUpdated: 'Langganan berhasil diperbarui',
    subscriptionDeleted: 'Langganan berhasil dihapus',
    subscriptionPaid: 'Pembayaran langganan berhasil diproses',
    
    // Pembayaran
    paymentProcessed: 'Pembayaran berhasil diproses',
    paymentCompleted: 'Pembayaran berhasil diselesaikan',
    
    // Dana
    fundTransferred: 'Dana berhasil ditransfer',
    fundReconciled: 'Dana berhasil direkonsiliasi',
    
    // Klien & Vendor
    clientAdded: 'Klien berhasil ditambahkan',
    clientUpdated: 'Klien berhasil diperbarui',
    vendorAdded: 'Vendor berhasil ditambahkan',
    vendorUpdated: 'Vendor berhasil diperbarui',
  },
  
  // Pesan error
  errors: {
    // Umum
    general: 'Terjadi kesalahan. Silakan coba lagi.',
    notFound: 'Data tidak ditemukan',
    serverError: 'Terjadi kesalahan pada server',
    networkError: 'Terjadi masalah jaringan',
    unauthorized: 'Anda tidak memiliki izin untuk melakukan tindakan ini',
    
    // Validasi
    required: '{field} wajib diisi',
    invalidFormat: 'Format {field} tidak valid',
    invalidNumber: '{field} harus berupa angka yang valid',
    positiveNumber: '{field} harus berupa angka positif',
    invalidDate: 'Format tanggal tidak valid',
    invalidEmail: 'Format email tidak valid',
    invalidUrl: 'Format URL tidak valid',
    passwordMismatch: 'Kata sandi tidak cocok',
    passwordTooShort: 'Kata sandi minimal 6 karakter',
    
    // Transaksi
    transactionError: 'Gagal memproses transaksi',
    
    // Pengeluaran
    expenseError: 'Gagal memproses pengeluaran',
    
    // Inventaris
    inventoryError: 'Gagal memproses inventaris',
    
    // Langganan
    subscriptionError: 'Gagal memproses langganan',
    
    // Pembayaran
    paymentError: 'Gagal memproses pembayaran',
    insufficientFunds: 'Dana tidak mencukupi',
    
    // Dana
    fundError: 'Gagal memproses dana',
    
    // Klien & Vendor
    clientError: 'Gagal memproses data klien',
    vendorError: 'Gagal memproses data vendor',
  },
  
  // Label umum
  common: {
    // Tindakan
    add: 'Tambah',
    edit: 'Edit',
    delete: 'Hapus',
    archive: 'Arsipkan',
    restore: 'Pulihkan',
    save: 'Simpan',
    cancel: 'Batal',
    confirm: 'Konfirmasi',
    search: 'Cari',
    filter: 'Filter',
    refresh: 'Segarkan',
    view: 'Lihat',
    download: 'Unduh',
    upload: 'Unggah',
    process: 'Proses',
    
    // Status
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    deleted: 'Dihapus',
    archived: 'Diarsipkan',
    pending: 'Tertunda',
    completed: 'Selesai',
    paid: 'Lunas',
    unpaid: 'Belum Bayar',
    partiallyPaid: 'Bayar Sebagian',
    
    // Waktu
    today: 'Hari Ini',
    yesterday: 'Kemarin',
    thisWeek: 'Minggu Ini',
    thisMonth: 'Bulan Ini',
    thisYear: 'Tahun Ini',
    lastWeek: 'Minggu Lalu',
    lastMonth: 'Bulan Lalu',
    lastYear: 'Tahun Lalu',
    
    // Lainnya
    loading: 'Memuat...',
    noData: 'Tidak ada data',
    all: 'Semua',
    total: 'Total',
    details: 'Detail',
    summary: 'Ringkasan',
    name: 'Nama',
    description: 'Deskripsi',
    date: 'Tanggal',
    amount: 'Jumlah',
    category: 'Kategori',
    status: 'Status',
    actions: 'Tindakan',
  },
  
  // Label khusus per modul
  modules: {
    // Dashboard
    dashboard: {
      title: 'Dasbor',
      overview: 'Ikhtisar',
      keyMetrics: 'Metrik Utama',
      recentTransactions: 'Transaksi Terbaru',
      recentExpenses: 'Pengeluaran Terbaru',
    },
    
    // Transaksi
    transactions: {
      title: 'Transaksi',
      newTransaction: 'Transaksi Baru',
      editTransaction: 'Edit Transaksi',
      transactionDetails: 'Detail Transaksi',
      transactionHistory: 'Riwayat Transaksi',
      revenue: 'Pendapatan',
      profit: 'Keuntungan',
      projectValue: 'Nilai Proyek',
      client: 'Klien',
      paymentStatus: 'Status Pembayaran',
      downPayment: 'Uang Muka',
      remainingPayment: 'Sisa Pembayaran',
    },
    
    // Pengeluaran
    expenses: {
      title: 'Pengeluaran',
      newExpense: 'Pengeluaran Baru',
      editExpense: 'Edit Pengeluaran',
      expenseDetails: 'Detail Pengeluaran',
      expenseHistory: 'Riwayat Pengeluaran',
      recurringExpenses: 'Pengeluaran Berulang',
      expenseCategory: 'Kategori Pengeluaran',
      fundSource: 'Sumber Dana',
      paymentProof: 'Bukti Pembayaran',
      unpaidItems: 'Item Belum Dibayar',
    },
    
    // Sumber Daya
    resources: {
      title: 'Sumber Daya',
      inventory: 'Inventaris',
      subscriptions: 'Langganan',
      clients: 'Klien',
      vendors: 'Vendor',
      newInventory: 'Inventaris Baru',
      editInventory: 'Edit Inventaris',
      inventoryDetails: 'Detail Inventaris',
      newSubscription: 'Langganan Baru',
      editSubscription: 'Edit Langganan',
      subscriptionDetails: 'Detail Langganan',
      quantity: 'Kuantitas',
      unitPrice: 'Harga Satuan',
      totalValue: 'Nilai Total',
      minimumStock: 'Stok Minimum',
      lowStock: 'Stok Rendah',
      location: 'Lokasi',
      supplier: 'Pemasok',
      purchaseDate: 'Tanggal Pembelian',
      expiryDate: 'Tanggal Kedaluwarsa',
      nextBillingDate: 'Tanggal Penagihan Berikutnya',
      billingCycle: 'Siklus Penagihan',
      reminderDays: 'Hari Pengingat',
    },
    
    // Dana
    funds: {
      title: 'Dana',
      fundTransfer: 'Transfer Dana',
      fundReconciliation: 'Rekonsiliasi Dana',
      fundHistory: 'Riwayat Dana',
      pettyCash: 'Kas Kecil',
      profitBank: 'Bank Keuntungan',
      balance: 'Saldo',
      fromFund: 'Dari Dana',
      toFund: 'Ke Dana',
      transferAmount: 'Jumlah Transfer',
    },
    
    // Pengaturan
    settings: {
      title: 'Pengaturan',
      profile: 'Profil',
      account: 'Akun',
      security: 'Keamanan',
      preferences: 'Preferensi',
      notifications: 'Notifikasi',
      company: 'Perusahaan',
      users: 'Pengguna',
      roles: 'Peran',
      permissions: 'Izin',
    },
  },
};

/**
 * Fungsi untuk mendapatkan pesan terjemahan dengan parameter
 * @param key - Kunci pesan (format: 'category.subcategory.key')
 * @param params - Parameter untuk dimasukkan ke dalam pesan
 * @returns Pesan terjemahan
 */
export function getMessage(key: string, params: Record<string, string> = {}): string {
  const keys = key.split('.');
  let message: any = messages;
  
  // Traverse object berdasarkan kunci
  for (const k of keys) {
    if (message[k] === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    message = message[k];
  }
  
  // Jika pesan bukan string, kembalikan kunci
  if (typeof message !== 'string') {
    console.warn(`Translation key does not point to a string: ${key}`);
    return key;
  }
  
  // Ganti parameter dalam pesan
  let result = message;
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    result = result.replace(`{${paramKey}}`, paramValue);
  });
  
  return result;
}

export default messages;
