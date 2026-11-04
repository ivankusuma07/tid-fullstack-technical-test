/**
 * Errors thrown by the domain / application layers. They carry no HTTP knowledge;
 * DomainExceptionFilter maps them to status codes at the edge.
 */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 404: the entity does not exist (or is not visible to the actor). */
export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
  }
}

/** 409: the action is not allowed in the entity's current status. */
export class InvalidTransitionError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** 403: the actor's role (or identity) is not allowed to perform the action. */
export class ForbiddenActionError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** 400: the input breaks a business rule (e.g. end date before start date). */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
