module.exports = function() {
	return {
		controller: require('./controller'),
		template: require('./template'),
		config: require('./config')
	};
}