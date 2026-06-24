export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (err.status === 400 || err.response?.code === 400) {
    return res.status(400).json({ success: false, message: 'Dados inválidos', errors: err.response?.data || {} });
  }
  if (err.status === 404) {
    return res.status(404).json({ success: false, message: 'Recurso não encontrado' });
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message,
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Rota não encontrada: ${req.method} ${req.path}` });
}
