import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const message = err instanceof Error ? err.message : 'حدث خطأ داخلي في خدمة واتساب.';
  const statusCode = typeof (err as { statusCode?: number })?.statusCode === 'number'
    ? (err as { statusCode: number }).statusCode
    : 500;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
