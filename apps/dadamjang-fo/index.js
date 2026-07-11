const { configureLogBox } = require('./src/shared/observability/log-box');

configureLogBox();

require('expo-router/entry');
