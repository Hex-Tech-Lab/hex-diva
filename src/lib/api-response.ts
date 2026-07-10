import { NextResponse } from 'next/server';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  cached?: boolean;
}

export function successResponse<T>(
  data: T,
  pagination?: ApiResponse<T>['pagination'],
  cached?: boolean
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  if (cached !== undefined) {
    response.cached = cached;
  }

  return NextResponse.json(response);
}

export function errorResponse(message: string, statusCode: number = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
      },
    },
    { status: statusCode }
  );
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  cached?: boolean
) {
  const pages = Math.ceil(total / limit);
  return successResponse(
    data,
    {
      page,
      limit,
      total,
      pages,
    },
    cached
  );
}
