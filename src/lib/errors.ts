import * as Sentry from '@sentry/nextjs';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(400, message, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(404, message, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(401, message, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code = 'FORBIDDEN') {
    super(403, message, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(409, message, code);
  }
}

export function handleError(error: unknown) {
  Sentry.captureException(error);

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    console.error('Unhandled error:', error);
    return {
      statusCode: 500,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }

  return {
    statusCode: 500,
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
  };
}
