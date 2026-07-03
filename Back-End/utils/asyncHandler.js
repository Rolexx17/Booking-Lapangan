/**
 * Middleware Wrapper untuk Async Route Handlers
 * Menangkap error dari async functions dan meneruskannya ke global error handler middleware
 * Menghilangkan keharusan untuk menambahkan try-catch di setiap route handler
 */

/**
 * Membuat wrapper function yang mengubah async handler menjadi middleware Express
 * yang dapat menangkap error secara otomatis
 * @param {Function} fn - Async route handler function (req, res, next) => Promise
 * @returns {Function} Middleware function yang sudah di-wrap
 */
export default function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    /**
     * Promise.resolve() memastikan fn selalu mengembalikan Promise
     * .catch(next) menangkap error dan meneruskannya ke error handler middleware
     * Jadi jika terjadi error di dalam fn, middleware error global akan menanganinya
     */
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
