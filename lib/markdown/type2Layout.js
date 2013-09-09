var map = {
	lesson: 'Post',
	unit: 'Unit'
};

module.exports = function(type) {
	return 'layouts' + (map[type] || 'Post');
}
