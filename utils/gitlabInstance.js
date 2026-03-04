const Gitlab = require('@gitbeaker/rest').Gitlab;
const getConfig = require('./getConfig');

const config = getConfig() || {};
const baseConfig = config.baseConfig || {};

module.exports = new Gitlab({
    host: baseConfig['gitUser-url'],
    token: baseConfig['gitUser-privateToken'],
});
