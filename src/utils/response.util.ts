import { Response } from 'express';

/**
 * Standard API response envelope used across all controllers.
 * Shape matches the convention already emitted by `AllExceptionsFilter`.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: string[];
  timestamp?: string;
}

/**
 * Send a successful response with the project's standard envelope.
 *
 * @example
 *   return sendSuccess(res, user, 'User created', 201);
 */
export function sendSuccess<T>(res: Response, data: T, message = 'OK', statusCode = 200): Response {
  const payload: ApiResponse<T> = {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
}

/**
 * Send an error response with the project's standard envelope.
 *
 * @example
 *   return sendError(res, 'Email already in use', 409);
 */
export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: string[],
): Response {
  const payload: ApiResponse = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors && errors.length > 0) {
    payload.errors = errors;
  }
  return res.status(statusCode).json(payload);
}
