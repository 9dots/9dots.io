var map = {
	lesson: 'Post',
	unit: 'Unit',
	wiki: 'Wiki'
};

module.exports = function(type) {
	return 'layouts' + (map[type] || 'Post');
}
