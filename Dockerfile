ARG NODE_VERSION=22.0.0

FROM node:${NODE_VERSION}-alpine

ENV NPM_CONFIG_LOGLEVEL info

WORKDIR /app

# Copy package root
COPY ./package.json ./.
COPY ./package-lock.json ./.
COPY ./tsconfig.json ./.
COPY ./settings.json ./.

# Npm clean-install
RUN npm ci

# Copy source code
COPY ./src ./src/

ENTRYPOINT ["npm", "run"]

# Possible modes: [ bot (default), summarizer ]
CMD ["bot"]

