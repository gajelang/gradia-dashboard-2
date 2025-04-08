/**
 * Format angka ke format Rupiah Indonesia (1000000 -> 1.000.000)
 * @param value - Nilai yang akan diformat (angka atau string)
 * @param options - Opsi tambahan untuk formatting
 * @returns String dalam format Rupiah
 */
export function formatRupiah(value: number | string, options: { withSymbol?: boolean, decimal?: boolean } = {}): string {
  // Default options
  const { withSymbol = true, decimal = false } = options;

  // Convert to number and handle invalid values
  const number = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(number)) {
    return withSymbol ? 'Rp0' : '0';
  }

  // Format with Indonesian locale
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimal ? 2 : 0,
    maximumFractionDigits: decimal ? 2 : 0,
  }).format(number);

  return withSymbol ? `Rp${formatted}` : formatted;
}