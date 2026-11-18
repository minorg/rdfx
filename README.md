# rdfx

TypeScript libraries for working with [RDF](https://www.w3.org/RDF/).

> ⚠️ **Under active development.** The libraries should be considered unstable and subject to breaking changes.

## Libraries

* [`@rdfx/builder`](packages/builder): builder pattern implementations for creating RDF in TypeScript for common shapes such as [SHACL-SHACL](https://www.w3.org/TR/shacl/#shacl-shacl) and [SKOS](https://www.w3.org/TR/skos-reference/)
* [`@rdfx/collection`](packages/collection): collections for [RDF/JS terms](https://rdf.js.org/data-model-spec/#term-interface), such as term maps and sets
* [`@rdfx/data-factory`](packages/data-factory): [RDF/JS DataFactory](https://rdf.js.org/data-model-spec/#datafactory-interface) implementation
* [`@rdfx/format`](packages/format): metadata about RDF formats such as [Turtle](https://www.w3.org/TR/turtle/) and utilities for inferring formats from file names
* [`@rdfx/fs`](packages/fs): read and write RDF from and to the file system
* [`@rdfx/git`](packages/git): git-backed versioned `GraphStore` implementations
* [`@rdfx/graph-store`](packages/graph-store): `GraphStore` abstraction modeled on the [SPARQL 1.1 Graph Store HTTP Protocol](https://www.w3.org/TR/sparql11-http-rdf-update/)
* [`@rdfx/iri`](packages/iri): utilities for working with [IRIs](https://en.wikipedia.org/wiki/Internationalized_Resource_Identifier)
* [`@rdfx/literal`](packages/literal): decoder and factory between [RDF/JS Literals](https://rdf.js.org/data-model-spec/#literal-interface) and JavaScript/TypeScript types
* [`@rdfx/logger`](packages/logger): `Logger` abstraction / facade over common logging libraries
* [`@rdfx/parser`](packages/parser): parsers for [RDF/JS streams](https://rdf.js.org/stream-spec/) and parsing convenience functions
* [`@rdfx/resource`](packages/resource): resource abstraction over [RDF/JS Datasets](https://rdf.js.org/dataset-spec/)
* [`@rdfx/serializer`](packages/serializer): serializers to [RDF/JS streams](https://rdf.js.org/stream-spec/) and serialization convenience functions
* [`@rdfx/sparql-client`](packages/sparql-client): [SPARQL](https://www.w3.org/TR/sparql11-protocol/) client
* [`@rdfx/stream`](packages/stream): utilities for working with [RDF/JS streams](https://rdf.js.org/stream-spec/)
* [`@rdfx/string`](packages/string): utilities for converting between strings and [RDF/JS terms](https://rdf.js.org/data-model-spec/#term-interface)
* [`@rdfx/testing`](packages/testing): testing utilities
* [`@rdfx/tinybase`](packages/tinybase): [TinyBase](https://tinybase.org)-backed `GraphStore` implementation
* [`@rdfx/xlsx`](packages/xlsx): read and write RDF from and to spreadsheets 

## Installation

    npm i @rdfx/resource

Substituting the appropriate library name.

## Development

These scripts work from the root (for all libraries) and individual libraries in `packages/`:

* Building: `npm run build`
* Testing: `npm run test`

## Contributing

The project is not accepting external contributions at this time. Feel free to open an issue if you encounter a bug or have a feature request.

## License

[Apache 2.0](LICENSE)
