import TermSet from "@rdfjs/term-set";
import type {
  BlankNode,
  DataFactory,
  DatasetCore,
  Literal,
  NamedNode,
  Quad_Graph,
  Variable,
} from "@rdfjs/types";

import { Either, Left } from "purify-ts";

import { DatasetValues } from "./DatasetValues.js";
import type { Identifier as _Identifier, Identifier } from "./Identifier.js";
import { ListStructureError as _ListStructureError } from "./ListStructureError.js";
import { MistypedTermValueError as _MistypedTermValueError } from "./MistypedTermValueError.js";
import type { PropertyPath } from "./PropertyPath.js";
import type { Term } from "./Term.js";
import { Value as _Value } from "./Value.js";
import { ValueError as _ValueError } from "./ValueError.js";
import { Values as _Values } from "./Values.js";
import { rdf, rdfs } from "./vocabularies.js";

/**
 * A Resource abstraction over subjects or objects in an RDF/JS dataset.
 */
export class Resource<
  IdentifierT extends Resource.Identifier = Resource.Identifier,
> {
  readonly dataFactory: DataFactory;
  readonly dataset: DatasetCore;
  readonly identifier: IdentifierT;

  constructor({
    dataFactory,
    dataset,
    identifier,
  }: {
    dataFactory: DataFactory;
    dataset: DatasetCore;
    identifier: IdentifierT;
  }) {
    this.dataFactory = dataFactory;
    this.dataset = dataset;
    this.identifier = identifier;
  }

  /**
   * Add zero or more values to this resource.
   */
  add(
    propertyPath: InversePath,
    value: AddableSubject | readonly AddableSubject[],
    graph?: Graph,
  ): this;

  add(
    propertyPath: NamedNode,
    value: AddableObject | readonly AddableObject[],
    graph?: Graph,
  ): this;

  add(
    propertyPath: InversePath | NamedNode,
    value:
      | AddableObject
      | readonly AddableObject[]
      | AddableSubject
      | readonly AddableSubject[],
    graph?: Graph,
  ): this {
    switch (propertyPath.termType) {
      case "InversePath":
        for (const subject of Array.isArray(value) ? value : [value]) {
          this.dataset.add(
            this.dataFactory.quad(
              subject,
              propertyPath.path,
              this.identifier,
              graph,
            ),
          );
        }
        break;
      case "NamedNode":
        for (const object of Array.isArray(value) ? value : [value]) {
          this.dataset.add(
            this.dataFactory.quad(this.identifier, propertyPath, object, graph),
          );
        }
        break;
    }

    return this;
  }

  /**
   * Create a new list, add items to it, and attach it to this resource via predicate in a
   * (this, predicate, newList) statement.
   *
   * Returns the list resource.
   */
  addList(
    predicate: NamedNode,
    items: Iterable<AddableObject>,
    options?: Parameters<Resource["addListItems"]>[1],
  ): Resource {
    const itemsArray = [...items];
    if (itemsArray.length === 0) {
      return new Resource({
        dataFactory: this.dataFactory,
        dataset: this.dataset,
        identifier: rdf.nil,
      });
    }

    const mintSubListIdentifier =
      options?.mintSubListIdentifier ?? (() => this.dataFactory.blankNode());

    const listResource = new Resource({
      dataFactory: this.dataFactory,
      dataset: this.dataset,
      identifier: mintSubListIdentifier(itemsArray[0], 0),
    });
    listResource.addListItems(itemsArray, {
      graph: options?.graph,
      mintSubListIdentifier,
    });

    this.add(predicate, listResource.identifier, options?.graph);

    return listResource;
  }

  /**
   * Add rdf:first and rdf:rest predicates to the current Resource.
   */
  addListItems(
    items: Iterable<AddableObject>,
    options?: {
      addSubListResourceValues?: (subListResource: Resource) => void;
      graph?: Graph;
      mintSubListIdentifier?: (
        item: AddableObject,
        itemIndex: number,
      ) => Identifier;
    },
  ): this {
    const addSubListResourceValues =
      options?.addSubListResourceValues ?? (() => {});
    const graph = options?.graph;
    const mintSubListIdentifier =
      options?.mintSubListIdentifier ?? (() => this.dataFactory.blankNode());

    let currentHead: Resource = this;
    let itemIndex = 0;
    for (const item of items) {
      if (itemIndex > 0) {
        // If currentHead !== this, then create a new head and point the current head's rdf:rest at it
        const newHead = new Resource({
          dataset: this.dataset,
          dataFactory: this.dataFactory,
          identifier: mintSubListIdentifier(item, itemIndex),
        });
        addSubListResourceValues(newHead);
        currentHead.add(rdf.rest, newHead.identifier, graph);
        currentHead = newHead;
      }
      currentHead.add(rdf.first, item, graph);
      itemIndex++;
    }
    if (itemIndex > 0) {
      // If there were any items there was an rdf:first on the current head
      // Close that head by adding an rdf:rest rdf:nil
      currentHead.add(rdf.rest, rdf.nil, graph);
    }
    return this;
  }

  /**
   * Delete zero or more values from this resource.
   *
   * If value is empty, delete all values of p
   * Else delete (p, arrayValue) for each value in the array.
   */
  delete(
    propertyPath: InversePath,
    value?: AddableSubject | readonly AddableSubject[],
    graph?: Graph,
  ): this;

  delete(
    propertyPath: NamedNode,
    value?: AddableObject | readonly AddableObject[],
    graph?: Graph,
  ): this;

  delete(
    propertyPath: InversePath | NamedNode,
    value?:
      | AddableObject
      | readonly AddableObject[]
      | AddableSubject
      | readonly AddableSubject[],
    graph?: Graph,
  ): this {
    switch (propertyPath.termType) {
      case "InversePath": {
        if (value) {
          for (const subject of Array.isArray(value) ? value : [value]) {
            for (const quad of [
              ...this.dataset.match(
                subject,
                propertyPath.path,
                this.identifier,
                graph,
              ),
            ]) {
              this.dataset.delete(quad);
            }
          }
        } else {
          for (const quad of [
            ...this.dataset.match(
              null,
              propertyPath.path,
              this.identifier,
              graph,
            ),
          ]) {
            this.dataset.delete(quad);
          }
        }

        break;
      }
      case "NamedNode": {
        if (value) {
          for (const object of Array.isArray(value) ? value : [value]) {
            for (const quad of [
              ...this.dataset.match(
                this.identifier,
                propertyPath,
                object,
                graph,
              ),
            ]) {
              this.dataset.delete(quad);
            }
          }
        } else {
          for (const quad of [
            ...this.dataset.match(this.identifier, propertyPath, null, graph),
          ]) {
            this.dataset.delete(quad);
          }
        }

        break;
      }
    }

    return this;
  }

  isInstanceOf(
    class_: NamedNode,
    options?: {
      excludeSubclasses?: boolean;
      graph?: Graph;
      instanceOfPredicate?: NamedNode;
      subClassOfPredicate?: NamedNode;
    },
  ): boolean {
    return isInstanceOfRecursive({
      class_,
      dataset: this.dataset,
      graph: options?.graph,
      instance: this.identifier,
      visitedClasses: new TermSet<NamedNode>(),
    });

    function isInstanceOfRecursive({
      class_,
      dataset,
      graph,
      instance,
      visitedClasses,
    }: {
      class_: NamedNode;
      dataset: DatasetCore;
      graph: Graph | undefined;
      instance: Identifier;
      visitedClasses: TermSet<NamedNode>;
    }): boolean {
      for (const _ of dataset.match(
        instance,
        options?.instanceOfPredicate ?? rdf.type,
        class_,
        graph,
      )) {
        return true;
      }

      visitedClasses.add(class_);

      if (options?.excludeSubclasses) {
        return false;
      }

      // Recurse into class's sub-classes that haven't been visited yet.
      for (const quad of dataset.match(
        null,
        options?.subClassOfPredicate ?? rdfs.subClassOf,
        class_,
        graph,
      )) {
        if (quad.subject.termType !== "NamedNode") {
          continue;
        }
        if (visitedClasses.has(quad.subject)) {
          continue;
        }
        if (
          isInstanceOfRecursive({
            class_: quad.subject,
            dataset,
            graph,
            instance,
            visitedClasses,
          })
        ) {
          return true;
        }
      }

      return false;
    }
  }

  isSubClassOf(
    class_: NamedNode,
    options?: {
      graph?: Graph;
      subClassOfPredicate?: NamedNode;
    },
  ): boolean {
    return isSubClassOfRecursive({
      class_,
      dataset: this.dataset,
      graph: options?.graph,
      thisIdentifier: this.identifier,
      visitedClasses: new TermSet<NamedNode>(),
    });

    function isSubClassOfRecursive({
      class_,
      dataset,
      graph,
      thisIdentifier,
      visitedClasses,
    }: {
      class_: NamedNode;
      dataset: DatasetCore;
      graph: Graph | undefined;
      thisIdentifier: Identifier;
      visitedClasses: TermSet<NamedNode>;
    }): boolean {
      for (const _ of dataset.match(
        thisIdentifier,
        options?.subClassOfPredicate ?? rdfs.subClassOf,
        class_,
        graph,
      )) {
        return true;
      }

      visitedClasses.add(class_);

      // Recurse into class's sub-classes that haven't been visited yet.
      for (const quad of dataset.match(
        null,
        options?.subClassOfPredicate ?? rdfs.subClassOf,
        class_,
        graph,
      )) {
        if (quad.subject.termType !== "NamedNode") {
          continue;
        }
        if (visitedClasses.has(quad.subject)) {
          continue;
        }
        if (
          isSubClassOfRecursive({
            class_: quad.subject,
            dataset,
            graph,
            thisIdentifier,
            visitedClasses,
          })
        ) {
          return true;
        }
      }

      return false;
    }
  }

  /**
   * Delete all existing values of p and then add the specified values.
   */
  set(
    propertyPath: InversePath,
    value: AddableSubject | readonly AddableSubject[],
    graph?: Graph,
  ): this;

  set(
    propertyPath: NamedNode,
    value: AddableObject | readonly AddableObject[],
    graph?: Graph,
  ): this;

  set(
    propertyPath: InversePath | NamedNode,
    value:
      | AddableObject
      | readonly AddableObject[]
      | AddableSubject
      | readonly AddableSubject[],
    graph?: Graph,
  ): this {
    switch (propertyPath.termType) {
      case "InversePath":
        this.delete(propertyPath, undefined, graph);
        return this.add(
          propertyPath,
          value as AddableSubject | readonly AddableSubject[],
          graph,
        );
      case "NamedNode":
        this.delete(propertyPath, undefined, graph);
        return this.add(
          propertyPath,
          value as AddableObject | readonly AddableObject[],
          graph,
        );
    }
  }

  /**
   * Consider the resource itself as an RDF list.
   */
  toList(options?: {
    graph?: Graph;
  }): Either<Resource.ValueError, Resource.Values> {
    if (this.identifier.equals(rdf.nil)) {
      return Either.of(
        Resource.Values.fromArray({
          focusResource: this,
          propertyPath: rdf.nil,
          values: [],
        }),
      );
    }

    const graph = options?.graph;

    const firstObjects = [
      ...new TermSet(
        [...this.dataset.match(this.identifier, rdf.first, null, graph)].map(
          (quad) => quad.object,
        ),
      ),
    ];
    if (firstObjects.length === 0) {
      return Left(
        new Resource.ListStructureError({
          focusResource: this,
          message: "list has no rdf:first statements",
          propertyPath: rdf.first,
        }),
      );
    }
    if (firstObjects.length > 1) {
      return Left(
        new Resource.ListStructureError({
          focusResource: this,
          message: "list has multiple rdf:first statements",
          propertyPath: rdf.first,
        }),
      );
    }
    const firstObject = firstObjects[0];
    switch (firstObject.termType) {
      case "BlankNode":
      case "Literal":
      case "NamedNode":
        break;
      default:
        return Left(
          new Resource.MistypedTermValueError({
            actualValue: firstObject,
            expectedValueType: "BlankNode | Literal | NamedNode",
            focusResource: this,
            propertyPath: rdf.first,
          }),
        );
    }

    const restObjects = [
      ...new TermSet(
        [...this.dataset.match(this.identifier, rdf.rest, null, graph)].map(
          (quad) => quad.object,
        ),
      ),
    ];
    if (restObjects.length === 0) {
      return Left(
        new Resource.ListStructureError({
          focusResource: this,
          message: "list has no rdf:rest statements",
          propertyPath: rdf.rest,
        }),
      );
    }
    if (restObjects.length > 1) {
      return Left(
        new Resource.ListStructureError({
          focusResource: this,
          message: "list has multiple rdf:rest statements",
          propertyPath: rdf.rest,
        }),
      );
    }
    const restObject = restObjects[0];
    switch (restObject.termType) {
      case "BlankNode":
      case "NamedNode":
        break;
      default:
        return Left(
          new Resource.MistypedTermValueError({
            actualValue: restObject,
            expectedValueType: "BlankNode | NamedNode",
            focusResource: this,
            propertyPath: rdf.rest,
          }),
        );
    }

    return Either.of<Resource.ValueError, Resource.Values<Resource.Value>>(
      new Resource.Value({
        dataFactory: this.dataFactory,
        focusResource: this,
        propertyPath: rdf.first,
        term: firstObject,
      }).toValues(),
    ).chain((items) =>
      new Resource({
        dataFactory: this.dataFactory,
        dataset: this.dataset,
        identifier: restObject,
      })
        .toList({ graph })
        .map((restItems) => items.concat(...restItems)),
    );
  }

  /**
   * Get the first matching value for the property path.
   */
  value(
    propertyPath: PropertyPath,
    options?: { graph?: Graph },
  ): Either<Resource.ValueError, Resource.Value> {
    return this.values(propertyPath, options).head();
  }

  /**
   * Get all values for the property path.
   */
  values(
    propertyPath: PropertyPath,
    options?: { graph?: Graph; unique?: boolean },
  ): Resource.Values {
    return new DatasetValues({
      dataFactory: this.dataFactory,
      focusResource: this,
      graph: options?.graph ?? null,
      propertyPath,
      unique: !!options?.unique,
    });
  }
}

type AddableObject = BlankNode | Literal | NamedNode;

type AddableSubject = BlankNode | NamedNode;

type Graph = Exclude<Quad_Graph, Variable>;

type InversePath = {
  readonly path: NamedNode;
  readonly termType: "InversePath";
};

export namespace Resource {
  export type Identifier = _Identifier;

  export const ListStructureError = _ListStructureError;
  export type ListStructureError = _ListStructureError;

  export const MistypedTermValueError = _MistypedTermValueError;
  export type MistypedTermValueError = _MistypedTermValueError;

  export const ValueError = _ValueError;
  export type ValueError = _ValueError;

  export const Value = _Value;
  export type Value<TermT extends Term = Term> = _Value<TermT>;

  export const Values = _Values;
  export type Values<T = Value> = _Values<T>;
}
