import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = async (
  err: Error & { statusCode?: number },
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log("Global error handler caught:", err);

  const errorDetails = {
    message: err.message,
    stack: err.stack,
    route: req.originalUrl,
    method: req.method,
    time: new Date(),
  };

  const serverResponse = res as unknown as import('http').ServerResponse;
  if(serverResponse.headersSent){
    return next(err);
  }

  if (err instanceof ZodError) {
    const message = err.issues.map(e => e.message).join(', ');
    res.status(400).json({ success: false, message });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({ success: false, message });
};
