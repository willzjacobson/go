#!/bin/bash
mkdir /var/analytics/FUN/yuck
cd /var/analytics/an_go/node
touch .env
echo "AWS_S3_JSON_ARCHIVE_BUCKET=pdanalytics" >> .env
echo "MONGO_SKYNET_URL=mongodb://SkynetReadWrite:zDyxbep7jxdmpcBc8pfjuLVY@10.0.11.134:27017,10.0.11.79:27017,10.0.10.216:27017/skynet?replicaSet=SamTheEagle&authSource=admin" >> .env
echo "MONGO_ANALYTICS_URL=mongodb://Analytics:L3x1^gt0n@10.0.11.134:27017,10.0.11.79:27017,10.0.10.216:27017/skynet?replicaSet=SamTheEagle&authSource=admin" >> .env
npm install
mv /var/analytics/an_go/an_go.conf /etc/init/an_go.conf