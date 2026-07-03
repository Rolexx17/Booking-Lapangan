/*
  Util untuk memformat respons API secara konsisten:
  - success: boolean (true jika statusCode 2xx)
  - message: string
  - data: optional payload
  - meta: optional metadata (paginasi, dsb)
  - errors: optional array objek error
  Fungsi ini dipakai di semua controller / middleware untuk keluaran yang seragam.
*/
export default function sendResponse(
  res,
  statusCode,
  message,
  data = null,
  meta = null,
  errors = null
) {
  const response = {
    success: statusCode >= 200 && statusCode < 300,
    message
  };

  if (data !== null && data !== undefined) response.data = data;
  if (meta) response.meta = meta;
  if (errors) response.errors = errors;

  return res.status(statusCode).json(response);
}