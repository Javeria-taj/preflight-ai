"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockfileParseError = exports.ApiUnreachableError = exports.ApiTimeoutError = void 0;
class ApiTimeoutError extends Error {
    constructor(pkg) {
        super(`Preflight API timed out for ${pkg}`);
        this.name = "ApiTimeoutError";
    }
}
exports.ApiTimeoutError = ApiTimeoutError;
class ApiUnreachableError extends Error {
    constructor(url) {
        super(`Preflight API unreachable at ${url}`);
        this.name = "ApiUnreachableError";
    }
}
exports.ApiUnreachableError = ApiUnreachableError;
class LockfileParseError extends Error {
    constructor(path) {
        super(`Failed to parse lockfile: ${path}`);
        this.name = "LockfileParseError";
    }
}
exports.LockfileParseError = LockfileParseError;
