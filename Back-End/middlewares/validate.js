// Middleware validasi input sederhana tanpa dependensi eksternal.
// Cara kerja:
// - Terima array rules, tiap rule minimal berisi field. Rule dapat menentukan:
//   required, type ('string'|'number'), minLength, pattern (RegExp), enum, min, max.
// - Apabila ada error validasi, kembalikan status 400 dengan daftar errors.
// - Jika valid, lanjutkan ke next().
export function validate(rules = []) {
  return (req, res, next) => {
    const errors = [];

    for (const rule of rules) {
      const value = req.body?.[rule.field];

      // Cek required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: rule.field, message: rule.message || `${rule.field} wajib diisi` });
        continue;
      }

      // Jika kosong dan tidak required, skip validasi lanjutan
      if (value === undefined || value === null || value === '') continue;

      // Tipe string
      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push({ field: rule.field, message: `${rule.field} harus berupa string` });
      }

      // Tipe number
      if (rule.type === 'number' && Number.isNaN(Number(value))) {
        errors.push({ field: rule.field, message: `${rule.field} harus berupa angka` });
      }

      // Min length
      if (rule.minLength && String(value).length < rule.minLength) {
        errors.push({
          field: rule.field,
          message: `${rule.field} minimal ${rule.minLength} karakter`
        });
      }

      // Regex pattern
      if (rule.pattern && !rule.pattern.test(String(value))) {
        errors.push({
          field: rule.field,
          message: rule.patternMessage || `${rule.field} tidak valid`
        });
      }

      // Enum
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
          field: rule.field,
          message: `${rule.field} harus salah satu dari: ${rule.enum.join(', ')}`
        });
      }

      // Min numeric
      if (rule.min !== undefined && Number(value) < rule.min) {
        errors.push({ field: rule.field, message: `${rule.field} minimal ${rule.min}` });
      }

      // Max numeric
      if (rule.max !== undefined && Number(value) > rule.max) {
        errors.push({ field: rule.field, message: `${rule.field} maksimal ${rule.max}` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors
      });
    }

    next();
  };
}