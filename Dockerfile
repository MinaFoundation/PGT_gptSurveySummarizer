ARG NODE_VERSION=21.7.1

FROM node:${NODE_VERSION}-alpine

ENV NPM_CONFIG_LOGLEVEL info

WORKDIR /app

# Copy package root
COPY ./package.json ./.
COPY ./package-lock.json ./.

# Npm clean-install
RUN npm ci

# Copy source code
COPY ./src/* ./src/

ENTRYPOINT ["npm", "run"]

# Possible modes: [ bot (default), summarizer ]
CMD ["bot"]

