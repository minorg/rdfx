import type { Quad, Quad_Object, Variable } from "@rdfjs/types";
import dataFactory from "@rdfx/data-factory";
import { xsd } from "@tpluscode/rdf-ns-builders";

const literals = {
  // rdf:langString
  langString: dataFactory.literal("langString", "en"),

  // String types
  string: dataFactory.literal("stringLiteralObject"),
  normalizedString: dataFactory.literal(
    "normalized string",
    xsd.normalizedString,
  ),
  token: dataFactory.literal("token", xsd.token),
  language: dataFactory.literal("en", xsd.language),
  name: dataFactory.literal("Name", xsd.Name),
  ncName: dataFactory.literal("NCName", xsd.NCName),
  nmtoken: dataFactory.literal("NMTOKEN", xsd.NMTOKEN),

  // Boolean
  boolean: dataFactory.literal("true", xsd.boolean),

  // Binary
  base64Binary: dataFactory.literal("SGVsbG8=", xsd.base64Binary),
  hexBinary: dataFactory.literal("48656C6C6F", xsd.hexBinary),

  // Numeric - integer hierarchy
  integer: dataFactory.literal("42", xsd.integer),
  nonPositiveInteger: dataFactory.literal("-1", xsd.nonPositiveInteger),
  negativeInteger: dataFactory.literal("-5", xsd.negativeInteger),
  long: dataFactory.literal("9223372036854775807", xsd.long),
  int: dataFactory.literal("2147483647", xsd.int),
  short: dataFactory.literal("32767", xsd.short),
  byte: dataFactory.literal("127", xsd.byte),
  nonNegativeInteger: dataFactory.literal("1", xsd.nonNegativeInteger),
  unsignedLong: dataFactory.literal("18446744073709551615", xsd.unsignedLong),
  unsignedInt: dataFactory.literal("4294967295", xsd.unsignedInt),
  unsignedShort: dataFactory.literal("65535", xsd.unsignedShort),
  unsignedByte: dataFactory.literal("255", xsd.unsignedByte),
  positiveInteger: dataFactory.literal("1", xsd.positiveInteger),

  // Numeric - decimal & floating point
  // decimal: DataFactory.literal("10.5", xsd.decimal),
  float: dataFactory.literal("3.14e0", xsd.float),
  double: dataFactory.literal("2.718281828459045e0", xsd.double),

  // Date & time
  date: dataFactory.literal("2002-09-24", xsd.date),
  dateTime: dataFactory.literal("2002-05-30T09:00:00", xsd.dateTime),
  dateTimeStamp: dataFactory.literal("2002-05-30T09:00:00Z", xsd.dateTimeStamp),
  // time: DataFactory.literal("09:00:00", xsd.time),
  // duration: DataFactory.literal("P1Y2M3DT4H5M6S", xsd.duration),
  // yearMonthDuration: DataFactory.literal("P1Y2M", xsd.yearMonthDuration),
  // dayTimeDuration: DataFactory.literal("P3DT4H", xsd.dayTimeDuration),
  // gYear: DataFactory.literal("2002", xsd.gYear),
  // gYearMonth: DataFactory.literal("2002-09", xsd.gYearMonth),
  // gMonth: DataFactory.literal("--09", xsd.gMonth),
  // gMonthDay: DataFactory.literal("--09-24", xsd.gMonthDay),
  // gDay: DataFactory.literal("---24", xsd.gDay),

  // URI & QName
  anyUri: dataFactory.literal("https://example.org/resource", xsd.anyURI),
  qName: dataFactory.literal("ex:localPart", xsd.QName),

  // NOTATION (rarely used)
  notation: dataFactory.literal("notationName", xsd.NOTATION),
} as const;

const objects: Record<string, Exclude<Quad_Object, Quad | Variable>> = {
  blankNode: dataFactory.blankNode(),
  namedNode: dataFactory.namedNode("http://example.com/namedNodeObject"),
};
for (const [key, literal] of Object.entries(literals)) {
  objects[`${key}Literal`] = literal;
}

const graph = dataFactory.namedNode("http://example.com/graph");
const predicate = dataFactory.namedNode("http://example.com/predicate");
const subject = dataFactory.namedNode("http://example.com/subject");

export const testData = {
  graph,
  literals,
  objects,
  predicate,
  subject,
};
