#!/bin/bash
mkdir /var/analytics/FUN/yuck
cd /var/analytics/an_go/node

# s3 bucket name and db login info
aws s3 cp s3://pdanalytics/.env .env

mv /var/analytics/an_go/an_go.conf /etc/init/an_go.conf

npm install

reboot