# syntax=docker/dockerfile:1
ARG NODE_VERSION=21.7.1

FROM --platform=linux/amd64 node:${NODE_VERSION}-alpine

ENV NPM_CONFIG_LOGLEVEL info

WORKDIR /app

# Copy source code
COPY ./src/* ./

RUN npm install

# Run the bot
CMD ["npm", "start"]
