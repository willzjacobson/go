#!/bin/bash

# s3 bucket name and db login info
aws s3 cp s3://pdanalytics/.env /var/analytics/an_go/node/.env

mv /var/analytics/an_go/an_go.conf /etc/init/an_go.conf

cd /var/analytics/an_go/node
npm install

reboot