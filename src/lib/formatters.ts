// Format number to Indonesian Rupiah format (1000000 -> 1.000.000)
export function formatRupiah(number: number): string {
    return new Intl.NumberFormat('id-ID').format(number);
  }