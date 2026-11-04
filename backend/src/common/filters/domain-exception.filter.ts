import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import {
  DomainError,
  ForbiddenActionError,
  InvalidTransitionError,
  NotFoundError,
  ValidationError,
} from '../errors/domain.errors';

type DomainErrorClass = new (...args: never[]) => DomainError;

const STATUS_BY_ERROR: [DomainErrorClass, HttpStatus][] = [
  [NotFoundError, HttpStatus.NOT_FOUND],
  [InvalidTransitionError, HttpStatus.CONFLICT],
  [ForbiddenActionError, HttpStatus.FORBIDDEN],
  [ValidationError, HttpStatus.BAD_REQUEST],
];

const REASON: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
};

/** Maps domain errors to HTTP, using the same body shape as Nest's built-in errors. */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost) {
    const status =
      STATUS_BY_ERROR.find(([cls]) => error instanceof cls)?.[1] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, error: REASON[status] ?? 'Internal Server Error', message: error.message });
  }
}
