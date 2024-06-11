import log from 'loglevel';
import prefix from 'loglevel-plugin-prefix';
import { GSS_LOG_LEVEL } from '@config';

prefix.reg(log);
prefix.apply(log, {
  format(level, name, timestamp) {
    return `${timestamp} ${level.toUpperCase()}:`;
  },
  timestampFormatter(date) {
    return date.toISOString();
  },
});

log.setLevel(log.levels.GSS_LOG_LEVEL);

export default log;