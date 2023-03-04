FROM node:lts-alpine as development

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

# run npm install in our local machine
RUN npm install

# Bundle app source
COPY . .

RUN npm run build

# Building for production
FROM node:lts-alpine as production

WORKDIR /usr/src/app

COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm ci --omit=dev

COPY --from=development /usr/src/app/build ./build