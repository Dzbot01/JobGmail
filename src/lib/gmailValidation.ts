/**
 * Validasi alamat Gmail yang disetorkan.
 * Aturan:
 *  - wajib berakhiran @gmail.com (huruf kecil)
 *  - bagian sebelum @ hanya huruf kecil a-z, angka 0-9 dan titik (tanpa spasi / karakter aneh)
 *  - tidak boleh huruf besar
 *  - maksimal 3 angka
 *  - titik tidak boleh di awal/akhir dan tidak boleh berurutan
 *  - panjang 6–30 karakter (aturan Gmail)
 * Mengembalikan pesan error, atau null jika valid.
 */
export const MAX_DIGITS = 3;

export function validateGmailAddress(raw: string): string | null {
  const email = raw.trim();
  if (!email) return 'Alamat email wajib diisi';
  if (/\s/.test(raw.trim())) return 'Email tidak boleh mengandung spasi';
  if (/[A-Z]/.test(email)) return 'Email tidak boleh menggunakan huruf besar';
  if (!email.endsWith('@gmail.com')) return 'Email harus berakhiran @gmail.com';
  const local = email.slice(0, -'@gmail.com'.length);
  if (!local) return 'Nama email sebelum @gmail.com wajib diisi';
  const bad = local.match(/[^a-z0-9.]/);
  if (bad) return `Karakter "${bad[0]}" tidak diperbolehkan (hanya huruf kecil, angka, dan titik)`;
  const digits = (local.match(/[0-9]/g) || []).length;
  if (digits > MAX_DIGITS) return `Angka maksimal ${MAX_DIGITS} (email ini memiliki ${digits} angka)`;
  if (local.startsWith('.') || local.endsWith('.')) return 'Email tidak boleh diawali atau diakhiri titik';
  if (local.includes('..')) return 'Email tidak boleh memiliki titik berurutan';
  const len = local.replace(/\./g, '').length;
  if (len < 6 || len > 30) return 'Nama email harus 6–30 karakter';
  return null;
}
