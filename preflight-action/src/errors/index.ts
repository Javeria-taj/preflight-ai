export class ApiTimeoutError extends Error {
  constructor(pkg: string) {
    super(`Preflight API timed out for ${pkg}`);
    this.name = "ApiTimeoutError";
  }
}

export class ApiUnreachableError extends Error {
  constructor(url: string) {
    super(`Preflight API unreachable at ${url}`);
    this.name = "ApiUnreachableError";
  }
}

export class LockfileParseError extends Error {
  constructor(path: string) {
    super(`Failed to parse lockfile: ${path}`);
    this.name = "LockfileParseError";
  }
}
