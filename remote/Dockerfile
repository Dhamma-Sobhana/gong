FROM balenalib/armv7hf-alpine-node:16.19.1-3.17-build as base

FROM base AS development

# change working directory
WORKDIR /usr/src/app

# Copies the package.json first for better cache on later pushes
COPY package*.json ./

# This install npm dependencies on the balena build server,
# making sure to clean up the artifacts it creates in order to reduce the image size.
RUN JOBS=MAX npm config set update-notifier false && npm install --unsafe-perm && npm cache verify && rm -rf /tmp/*

#nodev-cmd-live=node node_modules/nodemon/bin/nodemon.js src/main.ts

# This will copy all files in our root to the working directory in the container
COPY . .

# run nodemon
RUN npm run build

# server.js will run when container starts up on the device
#CMD ["npm", "run", "start"]

# Building for production
FROM base AS production

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY --from=development /usr/src/app/build ./build

RUN npm config set update-notifier false &&  npm ci --omit=dev

CMD ["npm", "run", "start"]