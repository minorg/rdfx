/**
 * Abstract base class for HTTP-based SPARQL clients.
 */
export abstract class HttpSparqlBaseClient<
  RequestOptionsT extends HttpSparqlBaseClient.RequestOptions,
> {
  protected defaultRequestOptions?: RequestOptionsT;
  protected readonly endpointUrl: string;

  constructor({
    defaultRequestOptions,
    endpointUrl,
  }: HttpSparqlBaseClient.Parameters<RequestOptionsT>) {
    this.defaultRequestOptions = defaultRequestOptions;
    this.endpointUrl = endpointUrl;
  }

  protected async ensureOkResponse(response: Response): Promise<Response> {
    if (response.ok) {
      return response;
    }

    throw await this.responseToError(response);
  }

  protected async fetch({
    body,
    hardCodedHeaders,
    method,
    options,
    url,
  }: {
    body: RequestInit["body"] | null;
    hardCodedHeaders: {
      accept: string | null;
      contentType: string | null;
    } | null;
    method: RequestInit["method"];
    options: RequestOptionsT | null;
    url: URL;
  }): Promise<Response> {
    const mergedHeaders = new Headers();

    // Keep track of which headers should be set vs. appended
    // This is used to enforce the semantics that:
    // - requestOptions headers overwrite (set) defaultRequestOptions headers
    // - requestOptions headers don't overwrite (set) each other, but append
    const setHeaderNames = new Set<string>();
    if (this.defaultRequestOptions?.headers) {
      for (const [
        name,
        value,
      ] of this.defaultRequestOptions.headers.entries()) {
        mergedHeaders.append(name, value);
        setHeaderNames.add(name);
      }
    }

    if (options?.headers) {
      for (const [name, value] of options.headers.entries()) {
        if (setHeaderNames.has(name)) {
          mergedHeaders.set(name, value);
          setHeaderNames.delete(name); // Append if we see another header with that name.
        } else {
          mergedHeaders.append(name, value);
        }
      }
    }

    if (hardCodedHeaders?.accept) {
      // Enforce our preference on accept
      mergedHeaders.set("accept", hardCodedHeaders.accept);
    }

    if (hardCodedHeaders?.contentType) {
      mergedHeaders.append("content-type", hardCodedHeaders.contentType);
    } else {
      mergedHeaders.delete("content-type");
    }

    // if (this.logger.isLevelEnabled("trace")) {
    //   this.logger.trace("request URL: %s", url);
    //   this.logger.trace("request method: %s", method);
    //   for (const [name, value] of mergedHeaders.entries()) {
    //     this.logger.trace("request header: %s: %s", name, value);
    //   }
    //   if (body && typeof body === "string") {
    //     this.logger.trace("request body (length=%s):\n%s", body.length, body);
    //   }
    // }

    return await fetch(url, {
      body,
      // cache: options?.cache ?? this.defaultRequestOptions?.cache,
      headers: mergedHeaders,
      method,
    });
  }

  protected async responseToError(response: Response): Promise<Error> {
    return new Error(
      `${response.status} ${response.statusText}: ${await response.text()}`,
    );
  }
}

export namespace HttpSparqlBaseClient {
  export interface Parameters<RequestOptionsT extends RequestOptions> {
    defaultRequestOptions?: RequestOptionsT;
    endpointUrl: string;
  }

  export interface RequestOptions {
    cache?: Request["cache"];
    headers?: Headers;
  }
}
