import { type Either, Left, Right } from "purify-ts";

// RFC 3987 scheme: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) ":"
const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

// Characters never allowed in an IRI reference:
// C0 controls, space, DEL, C1 controls, and < > " { } | \ ^ `
// biome-ignore lint/suspicious/noControlCharactersInRegex: Want the null
const FORBIDDEN = /[\u0000-\u0020\u007F-\u009F<>"{}|\\^`]/;

// A "%" must start a valid percent-encoded octet.
const BAD_PERCENT_ENCODING = /%(?![0-9A-Fa-f]{2})/;

export function validateAbsoluteIri(
  absoluteIri: string,
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

  const forbidden = FORBIDDEN.exec(absoluteIri);
  if (forbidden) {
    const codePoint = forbidden[0]
      .codePointAt(0)!
      .toString(16)
      .padStart(4, "0");
    return Left(
      new Error(`illegal character U+${codePoint} in IRI: ${absoluteIri}`),
    );
  }

  if (BAD_PERCENT_ENCODING.test(absoluteIri)) {
    return Left(new Error(`malformed percent-encoding in IRI: ${absoluteIri}`));
  }

  return Right(absoluteIri);
}
