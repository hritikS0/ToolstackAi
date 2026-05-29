import { NextFunction, Request, Response } from "express";

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
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({ success: false, message });
};
