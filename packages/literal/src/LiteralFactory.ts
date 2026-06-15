import type { DataFactory, Literal, NamedNode } from "@rdfjs/types";

import type { Decimal } from "decimal.js";
import { literalDatatypeDefinitions } from "./literalDatatypeDefinitions.js";
import type { Primitive } from "./Primitive.js";

class DatatypeRangeError extends RangeError {
  constructor(readonly datatype: NamedNode) {
    super(`datatype out of range: ${datatype.value}`);
  }
}

/**
 * Factory with methods for creating RDF/JS Literals from other types.
 */
export class LiteralFactory {
  private readonly dataFactory: DataFactory;
  private readonly xsd: {
    boolean: NamedNode<"http://www.w3.org/2001/XMLSchema#boolean">;
    byte: NamedNode<"http://www.w3.org/2001/XMLSchema#byte">;
    date: NamedNode<"http://www.w3.org/2001/XMLSchema#date">;
    dateTime: NamedNode<"http://www.w3.org/2001/XMLSchema#dateTime">;
    dateTimeStamp: NamedNode<"http://www.w3.org/2001/XMLSchema#dateTimeStamp">;
    decimal: NamedNode<"http://www.w3.org/2001/XMLSchema#decimal">;
    double: NamedNode<"http://www.w3.org/2001/XMLSchema#double">;
    float: NamedNode<"http://www.w3.org/2001/XMLSchema#float">;
    int: NamedNode<"http://www.w3.org/2001/XMLSchema#int">;
    integer: NamedNode<"http://www.w3.org/2001/XMLSchema#integer">;
    long: NamedNode<"http://www.w3.org/2001/XMLSchema#long">;
    short: NamedNode<"http://www.w3.org/2001/XMLSchema#short">;
    string: NamedNode<"http://www.w3.org/2001/XMLSchema#string">;
    unsignedByte: NamedNode<"http://www.w3.org/2001/XMLSchema#unsignedByte">;
    unsignedInt: NamedNode<"http://www.w3.org/2001/XMLSchema#unsignedInt">;
    unsignedLong: NamedNode<"http://www.w3.org/2001/XMLSchema#unsignedLong">;
    unsignedShort: NamedNode<"http://www.w3.org/2001/XMLSchema#unsignedShort">;
  };

  constructor({ dataFactory }: { dataFactory: DataFactory }) {
    this.dataFactory = dataFactory;
    this.xsd = {
      boolean: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#boolean",
      ),
      byte: this.dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#byte"),
      date: this.dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#date"),
      dateTime: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#dateTime",
      ),
      dateTimeStamp: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#dateTimeStamp",
      ),
      decimal: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#decimal",
      ),
      double: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#double",
      ),
      float: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#float",
      ),
      int: this.dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#int"),
      integer: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#integer",
      ),
      long: this.dataFactory.namedNode("http://www.w3.org/2001/XMLSchema#long"),
      short: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#short",
      ),
      string: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#string",
      ),
      unsignedByte: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#unsignedByte",
      ),
      unsignedInt: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#unsignedInt",
      ),
      unsignedLong: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#unsignedLong",
      ),
      unsignedShort: this.dataFactory.namedNode(
        "http://www.w3.org/2001/XMLSchema#unsignedShort",
      ),
    };
  }

  bigdecimal(value: Decimal, datatype?: NamedNode): Literal {
    return this.numeric(value, datatype ?? this.xsd.decimal);
  }

  bigint(value: bigint, datatype?: NamedNode): Literal {
    return this.numeric(value, datatype ?? this.xsd.integer);
  }

  boolean(value: boolean, datatype?: NamedNode): Literal {
    if (!datatype) {
      datatype = this.xsd.boolean;
    }
    const datatypeDefinition = literalDatatypeDefinitions[datatype.value];
    if (datatypeDefinition && datatypeDefinition.kind !== "boolean") {
      throw new DatatypeRangeError(datatype);
    }
    return this.dataFactory.literal(value.toString(), datatype);
  }

  date(value: Date, datatype?: NamedNode): Literal {
    if (!datatype) {
      datatype = this.xsd.dateTime;
    }

    const datatypeDefinition = literalDatatypeDefinitions[datatype.value];
    if (datatypeDefinition) {
      switch (datatypeDefinition.kind) {
        case "date":
          return this.dataFactory.literal(
            value.toISOString().replace(/T.*$/, ""),
            datatype,
          );
        case "datetime":
          return this.dataFactory.literal(value.toISOString(), datatype);
        default:
          throw new DatatypeRangeError(datatype);
      }
    }

    // case "http://www.w3.org/2001/XMLSchema#gDay":
    //   return this.dataFactory.literal(
    //     value.getUTCDate().toString(),
    //     datatype,
    //   );
    // case "http://www.w3.org/2001/XMLSchema#gMonthDay":
    //   return this.dataFactory.literal(
    //     `${value.getUTCMonth() + 1}-${value.getUTCDate()}`,
    //     datatype,
    //   );
    // case "http://www.w3.org/2001/XMLSchema#gYear":
    //   return this.dataFactory.literal(
    //     value.getUTCFullYear().toString(),
    //     datatype,
    //   );
    // case "http://www.w3.org/2001/XMLSchema#gYearMonth":
    //   return this.dataFactory.literal(
    //     `${value.getUTCFullYear()}-${value.getUTCMonth() + 1}`,
    //     datatype,
    //   );

    return this.dataFactory.literal(value.toISOString(), datatype);
  }

  number(value: number, datatype?: NamedNode): Literal {
    if (!datatype) {
      if (Number.isInteger(value)) {
        if (value < 0) {
          datatype = [this.xsd.byte, this.xsd.short, this.xsd.int].find(
            (checkDatatype) => {
              const checkDatatypeDefinition =
                literalDatatypeDefinitions[checkDatatype.value];
              if (checkDatatypeDefinition?.kind !== "int") {
                throw new Error("should never happen");
              }
              return value >= checkDatatypeDefinition.range[0];
            },
          );
        } else {
          datatype = [
            this.xsd.unsignedByte,
            this.xsd.unsignedShort,
            this.xsd.unsignedInt,
          ].find((checkDatatype) => {
            const checkDatatypeDefinition =
              literalDatatypeDefinitions[checkDatatype.value];
            if (checkDatatypeDefinition?.kind !== "int") {
              throw new Error("should never happen");
            }
            return value <= checkDatatypeDefinition.range[1];
          });
        }

        if (!datatype) {
          datatype = this.xsd.integer;
        }
      } else {
        datatype = this.xsd.double;
      }
    }

    return this.numeric(value, datatype);
  }

  primitive(value: Primitive, datatype?: NamedNode): Literal {
    switch (typeof value) {
      case "bigint":
        return this.bigint(value, datatype);
      case "boolean":
        return this.boolean(value, datatype);
      case "number":
        return this.number(value, datatype);
      case "string":
        return this.string(value, datatype);
    }
  }

  string(value: string, datatype?: NamedNode) {
    if (datatype) {
      const datatypeDefinition = literalDatatypeDefinitions[datatype.value];
      if (datatypeDefinition && datatypeDefinition.kind !== "string") {
        throw new DatatypeRangeError(datatype);
      }
    }

    return this.dataFactory.literal(value, datatype);
  }

  private numeric(
    value: bigint | Decimal | number,
    datatype: NamedNode,
  ): Literal {
    let valueString: string | undefined;

    const datatypeDefinition = literalDatatypeDefinitions[datatype.value];
    if (datatypeDefinition) {
      if (Number.isNaN(value) || value === Infinity || value === -Infinity) {
        if (datatypeDefinition.kind !== "float") {
          throw new RangeError(
            `NaN/INF/-INF values only supported by xsd:double and xsd:float`,
          );
        }
      } else {
        switch (datatypeDefinition.kind) {
          case "bigdecimal":
            break;
          case "bigint":
          case "float":
          case "int": {
            const [min, max] = datatypeDefinition.range;

            if (max !== undefined) {
              if (typeof value === "object") {
                if (value.gt(max)) {
                  throw new RangeError(
                    `value (${value}) above maximum (${max}) of ${datatype.value}`,
                  );
                }
              } else if (value > max) {
                throw new RangeError(
                  `value (${value}) above maximum (${max}) of ${datatype.value}`,
                );
              }
            }

            if (min !== undefined) {
              if (typeof value === "object") {
                if (value.lt(min)) {
                  throw new RangeError(
                    `value (${value}) below minimum (${min}) of ${datatype.value}`,
                  );
                }
              } else if (value < min) {
                throw new RangeError(
                  `value (${value}) below minimum (${min}) of ${datatype.value}`,
                );
              }
            }

            break;
          }
          default:
            throw new DatatypeRangeError(datatype);
        }

        if (datatypeDefinition.kind === "float") {
          // Convert the number to scientific notation so Turtle will recognize it as an double without ^^
          // Example: 1 -> 1e0

          // Assume this coercion to number won't lose anything since we checked the range above.
          let [mantissa, exponent] = Number(value).toExponential().split("e");
          exponent = exponent.replace(/^\+/, "").replace(/^(-?)0+(\d)/, "$1$2");

          valueString = `${mantissa}e${exponent}`;
        }
      }
    }

    if (!valueString) {
      if (typeof value === "number") {
        if (Number.isNaN(value)) {
          valueString = "NaN";
        } else if (value === Infinity) {
          valueString = "INF";
        } else if (value === -Infinity) {
          valueString = "-INF";
        }
      }

      if (!valueString) {
        valueString = value.toString(10);
      }
    }

    return this.dataFactory.literal(valueString, datatype);
  }
}
