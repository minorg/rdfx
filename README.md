# rdfx

TypeScript libraries for working with [RDF](https://www.w3.org/RDF/).

> ⚠️ **Under active development.** The libraries should be considered unstable and subject to breaking changes.

## Libraries

* [`@rdfx/data-factory`](packages/data-factory): [RDF/JS DataFactory](https://rdf.js.org/data-model-spec/#datafactory-interface) implementation
* [`@rdfx/fs`](packages/fs): utilities for reading RDF data from the file system
* [`@rdfx/literal`](packages/literal): decoder and factory between [RDF/JS Literals](https://rdf.js.org/data-model-spec/#literal-interface) and JavaScript/TypeScript types
* [`@rdfx/resource`](packages/resource): resource abstraction over [RDF/JS Datasets](https://rdf.js.org/dataset-spec/)
* [`@rdfx/sparql-client`](packages/sparql-client): [SPARQL](https://www.w3.org/TR/sparql11-protocol/) client
* [`@rdfx/string`](packages/string): utilities for converting between strings and [RDF/JS terms](https://rdf.js.org/data-model-spec/#term-interface)
* [`@rdfx/testing`](packages/testing): testing utilities

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
