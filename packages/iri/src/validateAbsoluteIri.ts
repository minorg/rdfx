import { type Either, Left, Right } from "purify-ts";
import { type IriValidationStrategy, validateIri } from "validate-iri";

// RFC 3987 scheme: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) ":"
const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

export function validateAbsoluteIri(
  absoluteIri: string,
  strategy?: IriValidationStrategy,
): Either<Error, string> {
  if (!SCHEME.test(absoluteIri)) {
    return Left(
      new Error(`not an absolute IRI (missing/invalid scheme): ${absoluteIri}`),
    );
  }

  // Scheme-only ("foo:") is syntactically legal but useless as an RDF term.
  if (
    absoluteIri.endsWith(":") &&
    absoluteIri.indexOf(":") === absoluteIri.length - 1
  ) {
    return Left(
      new Error(`not an absolute IRI (empty after scheme): ${absoluteIri}`),
    );
  }

  const error = validateIri(absoluteIri, strategy);
  if (error !== undefined) {
    return Left(error);
  }
  return Right(absoluteIri);
}
