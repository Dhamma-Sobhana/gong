FROM balenalib/armv7hf-alpine-node:18.12-3.17-run as base

FROM base as development

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

# run npm install in our local machine
RUN npm config set update-notifier false && npm install

#dev-cmd-live=node node_modules/nodemon/bin/nodemon.js src/main.ts

# bundle app source
COPY . .

# run nodemon
RUN npm run build

# Building for production
FROM base as production

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY --from=development /usr/src/app/build ./build
COPY --from=development /usr/src/app/public ./public
COPY --from=development /usr/src/app/views ./views
COPY --from=development /usr/src/app/resources ./resources

RUN npm config set update-notifier false &&  npm ci --omit=dev

CMD ["npm", "run", "start"]