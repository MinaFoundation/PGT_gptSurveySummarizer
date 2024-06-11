import log from 'loglevel';
import prefix from 'loglevel-plugin-prefix';
import { GSS_LOG_LEVEL } from './config.js';

prefix.reg(log);
prefix.apply(log, {
  format(level, name, timestamp) {
    return `${timestamp} ${level.toUpperCase()}:`;
  },
  timestampFormatter(date) {
    return date.toISOString();
  },
});

const logLevelMap = {
  TRACE: log.levels.TRACE,
  DEBUG: log.levels.DEBUG,
  INFO: log.levels.INFO,
  WARN: log.levels.WARN,
  ERROR: log.levels.ERROR,
  SILENT: log.levels.SILENT,
};

const currentLogLevel = logLevelMap[GSS_LOG_LEVEL.toUpperCase()] || log.levels.INFO;
log.setLevel(currentLogLevel);

export default log;
