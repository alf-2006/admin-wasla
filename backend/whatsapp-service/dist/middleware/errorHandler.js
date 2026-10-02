export function errorHandler(err, _req, res, _next) {
    const message = err instanceof Error ? err.message : 'حدث خطأ داخلي في خدمة واتساب.';
    const statusCode = typeof err?.statusCode === 'number'
        ? err.statusCode
        : 500;
    res.status(statusCode).json({
        success: false,
        error: message,
    });
}
