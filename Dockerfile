FROM node:latest

RUN mkdir parse

ADD . /parse
WORKDIR /parse
# 使用阿里的npm镜像加速。
RUN npm config set registry https://registry.npm.taobao.org
RUN npm install

ENV APP_ID setYourAppId
ENV MASTER_KEY setYourMasterKey
ENV DATABASE_URI setMongoDBURI

# Optional (default : 'parse/cloud/main.js')
# ENV CLOUD_CODE_MAIN cloudCodePath

# Optional (default : '/parse')
# ENV PARSE_MOUNT mountPath

EXPOSE 1337

# Uncomment if you want to access cloud code outside of your container
# A main.js file must be present, if not Parse will not start

# VOLUME /parse/cloud

CMD [ "npm", "start" ]
