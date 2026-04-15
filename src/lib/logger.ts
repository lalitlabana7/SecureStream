/**
 * Production-safe logger. In development, logs normally.
 * In production, only warns and errors are shown.
 */

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

export const logger = {
  debug: isDev ? console.log.bind(console) : () => {},
  info: isDev ? console.info.bind(console) : () => {},
  log: isDev ? console.log.bind(console) : () => {},
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};
