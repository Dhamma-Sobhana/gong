FROM balenalib/armv7hf-alpine-node:18.12-3.17-run as development

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

# Update NPM until Balena does it
RUN npm install -g npm@9.6.1

# run npm install in our local machine
RUN npm install

# Bundle app source
COPY . .

RUN npm run build

# Building for production
FROM balenalib/armv7hf-alpine-node:18.12-3.17-run as production

WORKDIR /usr/src/app

COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Update NPM until Alpine image does it
RUN npm install -g npm@9.6.1

RUN npm ci --omit=dev

COPY --from=development /usr/src/app/build ./build