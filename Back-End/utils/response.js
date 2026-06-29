// Memformat dan mengirimkan respons API secara seragam

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