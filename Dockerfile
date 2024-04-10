ARG NODE_VERSION=21.7.1

FROM node:${NODE_VERSION}-alpine

# Install redis-cli
RUN apk update && apk add redis

ENV NPM_CONFIG_LOGLEVEL info

WORKDIR /app

# Copy entrypoint.sh
COPY --chmod=744 ./scripts/entrypoint.sh /usr/local/bin/

# Copy package root
COPY ./package.json ./.
COPY ./package-lock.json ./.

# Npm clean-install
RUN npm ci

# Copy source code
COPY ./src/* ./src/

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Possible modes: [ bot (default), summarizer ]
CMD ["bot"]

