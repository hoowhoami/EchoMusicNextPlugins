/** Qt's console is available; DOM, browser fetch and Node globals are not SDK APIs. */
declare const console: {
  debug(...values: unknown[]): void;
  log(...values: unknown[]): void;
  info(...values: unknown[]): void;
  warn(...values: unknown[]): void;
  error(...values: unknown[]): void;
};
