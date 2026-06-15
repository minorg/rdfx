import dataFactory from "@rdfx/data-factory";

export namespace rdf {
  export const first = dataFactory.namedNode(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
  );
  export const langString = dataFactory.namedNode(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  );
  export const nil = dataFactory.namedNode(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
  );
  export const rest = dataFactory.namedNode(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
  );
  export const type = dataFactory.namedNode(
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
  );
}

export namespace rdfs {
  export const subClassOf = dataFactory.namedNode(
    "http://www.w3.org/2000/01/rdf-schema#subClassOf",
  );
}

export namespace sh {
  export const alternativePath = dataFactory.namedNode(
    "http://www.w3.org/ns/shacl#alternativePath",
  );
  export const inversePath = dataFactory.namedNode(
    "http://www.w3.org/ns/shacl#inversePath",
  );
  export const oneOrMorePath = dataFactory.namedNode(
    "http://www.w3.org/ns/shacl#oneOrMorePath",
  );
  export const zeroOrMorePath = dataFactory.namedNode(
    "http://www.w3.org/ns/shacl#zeroOrMorePath",
  );
  export const zeroOrOnePath = dataFactory.namedNode(
    "http://www.w3.org/ns/shacl#zeroOrOnePath",
  );
}

export namespace xsd {
  export const boolean = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#boolean",
  );
  export const byte = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#byte",
  );
  export const date = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#date",
  );
  export const dateTime = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#dateTime",
  );
  export const dateTimeStamp = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#dateTimeStamp",
  );
  export const decimal = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#decimal",
  );
  export const double = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#double",
  );
  export const float = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#float",
  );
  export const int = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#int",
  );
  export const integer = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#integer",
  );
  export const long = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#long",
  );
  export const short = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#short",
  );
  export const string = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#string",
  );
  export const unsignedByte = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#unsignedByte",
  );
  export const unsignedInt = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#unsignedInt",
  );
  export const unsignedLong = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#unsignedLong",
  );
  export const unsignedShort = dataFactory.namedNode(
    "http://www.w3.org/2001/XMLSchema#unsignedShort",
  );
}
