/**
 * Indicates the operation requires the user to be signed in but the user is
 * currently not signed in.
 */
export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in.')
    this.name = 'NotSignedInError'
  }
}

/**
 * An unexpected error was encountered. This may result from programmatic error
 * and is unlikely to be user recoverable.
 */
export class FatalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FatalError'
  }
}
