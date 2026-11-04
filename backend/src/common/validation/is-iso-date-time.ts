import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

/**
 * ISO 8601 date-time that carries its timezone (Z or +hh:mm), e.g. 2026-11-04T13:00:00.000Z.
 * A value without an offset is ambiguous (whose local time?), so it is rejected.
 */
export const IsIsoDateTime = () =>
  applyDecorators(
    IsISO8601({ strict: true }),
    Matches(/T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/, {
      message: ({ property }) => `${property} must be an ISO 8601 date-time with a timezone offset`,
    }),
  );
