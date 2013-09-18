module.exports = {
  controller: require('./controller'),
  filter: function() {
  	return function(path) {
  		if (!path)
  			return path
  		else
  			return (SETTINGS.config.uploads || '') + path;
  	}
  } 
};