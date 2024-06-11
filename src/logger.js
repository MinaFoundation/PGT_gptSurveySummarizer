import log from 'loglevel';
import prefix from 'loglevel-plugin-prefix';

prefix.reg(log);
prefix.apply(log, {
  format(level, name, timestamp) {
    return `${timestamp} ${level.toUpperCase()}:`;
  },
  timestampFormatter(date) {
    return date.toISOString();
  },
});

log.setLevel(log.levels.INFO); // Set the desired log level

export default log;