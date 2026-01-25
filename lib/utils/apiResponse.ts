/**
 * API Response Utilities
 * 
 * Standardized response formats for API routes
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard error response format
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Standard success response format
 */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    } as ApiSuccess<T>,
    { status }
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  const errorObj: ApiError = {
    error: {
      code,
      message,
    },
  };

  if (details) {
    errorObj.error.details = details;
  }

  return NextResponse.json(errorObj, { status });
}

/**
 * Handle Zod validation errors
 */
export function validationErrorResponse(error: ZodError<unknown>) {
  const firstError = error.issues[0];
  return errorResponse(
    'VALIDATION_ERROR',
    firstError?.message || 'Validation failed',
    400,
    error.issues
  );
}

/**
 * Handle authentication errors
 */
export function unauthorizedResponse(message = 'Authentication required') {
  return errorResponse('UNAUTHORIZED', message, 401);
}

/**
 * Handle forbidden errors
 */
export function forbiddenResponse(message = 'Access denied') {
  return errorResponse('FORBIDDEN', message, 403);
}

/**
 * Handle not found errors
 */
export function notFoundResponse(message = 'Resource not found') {
  return errorResponse('NOT_FOUND', message, 404);
}

/**
 * Handle internal server errors
 */
export function internalErrorResponse(message = 'Internal server error') {
  return errorResponse('INTERNAL_ERROR', message, 500);
}

/**
 * Handle rate limit errors
 */
export function rateLimitResponse(message = 'Too many requests') {
  return errorResponse('RATE_LIMIT', message, 429);
}
