export class AuthError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export class UnauthenticatedError extends AuthError {
  constructor() {
    super("Authentification requise.", 401);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = "Accès refusé.") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class OriasPendingError extends AuthError {
  constructor() {
    super("Votre numéro ORIAS n'a pas encore été validé.", 403);
    this.name = "OriasPendingError";
  }
}
