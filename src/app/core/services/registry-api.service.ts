import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import type { CatalogResponse, TagsListResponse } from '../models';
import { CacheRequestService } from './cache-request.service';

const AUTHENTICATE_HEADER_REGEX =
  /Bearer realm="(?<realm>[^"]+)",service="(?<service>[^"]+)",scope="(?<scope>[^"]+)"/;

export interface BearerToken {
  token?: string;
  access_token?: string;
}

@Injectable({ providedIn: 'root' })
export class RegistryApiService {
  constructor(
    private http: HttpClient,
    private cache: CacheRequestService
  ) {}

  /**
   * GET with optional credentials and 401 Bearer flow.
   * For same-origin or proxy, credentials are sent automatically when withCredentials is set.
   */
  get<T>(
    url: string,
    options: {
      withCredentials?: boolean;
      headers?: HttpHeaders | Record<string, string>;
      useCache?: boolean;
    } = {}
  ): Observable<T> {
    const { withCredentials = false, headers = {}, useCache = false } = options;

    const cached = this.cache.get(url);
    if (useCache && cached) {
      return of(cached.body as T);
    }

    const headerObj: Record<string, string> =
      headers instanceof HttpHeaders
        ? headers.keys().reduce((acc, k) => {
            const v = headers.get(k);
            return { ...acc, [k]: v != null ? v : '' };
          }, {} as Record<string, string>)
        : (headers as Record<string, string>);
    let req = this.http.get<T>(url, {
      responseType: 'json',
      withCredentials,
      headers: new HttpHeaders(headerObj),
      observe: 'response',
    });

    return req.pipe(
      map((res) => {
        const body = res.body as T;
        if (useCache && res.body != null && res.headers?.get('Docker-Content-Digest')) {
          this.cache.set(url, {
            body: res.body,
            dockerContentDigest: res.headers.get('Docker-Content-Digest'),
          });
        }
        return body;
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && err.headers?.get('www-authenticate')) {
          const auth = this.parseAuthenticate(err.headers.get('www-authenticate')!);
          if (auth) {
            return this.fetchBearerToken(auth, withCredentials).pipe(
              switchMap((bearer) => {
                const b = bearer as BearerToken;
                const authHeader = b?.token ?? b?.access_token;
                return this.http.get<T>(url, {
                  responseType: 'json',
                  withCredentials: !bearer,
                  headers: new HttpHeaders({
                    ...(headerObj as Record<string, string>),
                    ...(authHeader ? { Authorization: `Bearer ${authHeader}` } : {}),
                  }),
                });
              }),
              catchError((e: unknown) => {
                throw e;
              })
            );
          }
        }
        throw err;
      })
    );
  }

  getText(
    url: string,
    options: { withCredentials?: boolean; headers?: Record<string, string> } = {}
  ): Observable<{ body: string; dockerContentDigest?: string }> {
    const { withCredentials = false, headers = {} } = options;
    return this.http
      .get(url, {
        responseType: 'text',
        withCredentials,
        headers: new HttpHeaders(headers),
        observe: 'response',
      })
      .pipe(
        map((res) => ({
          body: res.body ?? '',
          dockerContentDigest: res.headers.get('Docker-Content-Digest') ?? undefined,
        }))
      );
  }

  delete(
    url: string,
    options: {
      withCredentials?: boolean;
      headers?: Record<string, string>;
    } = {}
  ): Observable<void> {
    const { withCredentials = false, headers = {} } = options;
    return this.http.delete<void>(url, {
      withCredentials,
      headers: new HttpHeaders(headers),
    });
  }

  getCatalog(registryUrl: string, limit: number, withCredentials: boolean): Observable<CatalogResponse> {
    const url = `${registryUrl.replace(/\/$/, '')}/v2/_catalog?n=${limit}`;
    return this.get<CatalogResponse>(url, { withCredentials });
  }

  getTagsList(registryUrl: string, name: string, withCredentials: boolean): Observable<TagsListResponse> {
    const url = `${registryUrl.replace(/\/$/, '')}/v2/${name}/tags/list`;
    return this.get<TagsListResponse>(url, { withCredentials });
  }

  getManifest(
    registryUrl: string,
    name: string,
    reference: string,
    withCredentials: boolean,
    acceptList = false,
    useControlCacheHeader = false
  ): Observable<unknown> {
    const base = registryUrl.replace(/\/$/, '');
    const url = `${base}/v2/${name}/manifests/${reference}`;
    const cached = this.cache.getText(url);
    if (cached) {
      return of(JSON.parse(cached.body) as unknown);
    }
    const accept =
      'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json' +
      (acceptList ? ', application/vnd.docker.distribution.manifest.list.v2+json' : '');
    const headers: Record<string, string> = { Accept: accept };
    if (useControlCacheHeader) {
      headers['Cache-Control'] = 'no-store, no-cache';
    }
    return this.getText(url, { withCredentials, headers }).pipe(
      map(({ body, dockerContentDigest }) => {
        this.cache.set(url, { body, dockerContentDigest });
        return JSON.parse(body) as unknown;
      }),
      catchError((err: HttpErrorResponse) => {
        const msg = err.error && typeof err.error === 'object' ? JSON.stringify(err.error) : err.message;
        throw { ...err, message: msg };
      })
    );
  }

  getBlob(
    registryUrl: string,
    name: string,
    digest: string,
    withCredentials: boolean
  ): Observable<unknown> {
    const base = registryUrl.replace(/\/$/, '');
    const url = `${base}/v2/${name}/blobs/${digest}`;
    const useCache = /^sha256:[a-f0-9]+$/.test(digest);
    return this.get<unknown>(url, {
      withCredentials,
      headers: {
        Accept:
          'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json',
      },
      useCache,
    });
  }

  /**
   * GET manifest for a tag and return the Docker-Content-Digest (for delete).
   * Handles 401 Bearer like other GETs.
   */
  getManifestDigest(
    registryUrl: string,
    name: string,
    reference: string,
    withCredentials: boolean
  ): Observable<string | undefined> {
    const base = registryUrl.replace(/\/$/, '');
    const url = `${base}/v2/${name}/manifests/${reference}`;
    const accept =
      'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json';
    const headers = new HttpHeaders({ Accept: accept });
    return this.http
      .get(url, {
        responseType: 'text',
        withCredentials,
        headers,
        observe: 'response',
      })
      .pipe(
        map((res) => res.headers.get('Docker-Content-Digest') ?? undefined),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401 && err.headers?.get('www-authenticate')) {
            const auth = this.parseAuthenticate(err.headers.get('www-authenticate')!);
            if (auth) {
              return this.fetchBearerToken(auth, withCredentials).pipe(
                switchMap((bearer) => {
                  const b = bearer as BearerToken;
                  const authHeader = b?.token ?? b?.access_token;
                  return this.http.get(url, {
                    responseType: 'text',
                    withCredentials: !bearer,
                    headers: new HttpHeaders({
                      Accept: accept,
                      ...(authHeader ? { Authorization: `Bearer ${authHeader}` } : {}),
                    }),
                    observe: 'response',
                  });
                }),
                map((res) => res.headers.get('Docker-Content-Digest') ?? undefined),
                catchError((e: unknown) => {
                  throw e;
                })
              );
            }
          }
          throw err;
        })
      );
  }

  deleteManifest(
    registryUrl: string,
    name: string,
    digest: string,
    withCredentials: boolean,
    dockerContentDigest: string
  ): Observable<void> {
    const base = registryUrl.replace(/\/$/, '');
    const url = `${base}/v2/${name}/manifests/${digest}`;
    return this.delete(url, {
      withCredentials,
      headers: { 'Docker-Content-Digest': dockerContentDigest },
    });
  }

  private parseAuthenticate(header: string): { realm: string; service: string; scope: string } | null {
    const m = AUTHENTICATE_HEADER_REGEX.exec(header);
    const g = m?.groups;
    return g
      ? {
          realm: g['realm'] ?? '',
          service: g['service'] ?? '',
          scope: g['scope'] ?? '',
        }
      : null;
  }

  private fetchBearerToken(
    auth: { realm: string; service: string; scope: string },
    withCredentials: boolean
  ): Observable<BearerToken | null> {
    const url = `${auth.realm}?service=${encodeURIComponent(auth.service)}&scope=${encodeURIComponent(auth.scope)}`;
    return from(
      fetch(url, { credentials: withCredentials ? 'include' : 'omit' }).then((r) => r.json())
    );
  }
}
