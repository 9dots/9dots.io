var config = require('../../config');
var dev = config.dev;
delete config.dev;
if (process.env.NODE_ENV !== 'production') {
	var _ = require('underscore');
	_.mixin({deepExtend: require('underscoreDeepExtend')(_)});
	_.deepExtend(config, dev);
}

module.exports = config;