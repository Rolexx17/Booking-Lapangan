// Wrapper async agar error otomatis diteruskan ke middleware error handler global
export default function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}