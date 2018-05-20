#!/bin/sh
rm -rf dist
mkdir -p dist/css
mkdir -p dist/js
mkdir -p dist/fonts
cp -f node_modules/bootstrap/dist/css/bootstrap.min.css dist/css
cp -f node_modules/vue/dist/vue.min.js dist/js
cp -f node_modules/font-awesome/css/font-awesome.min.css dist/css
cp -Rf node_modules/font-awesome/fonts/* dist/fonts/
cp -f slick/*.js dist/js
cp -f slick/*.css dist/css
