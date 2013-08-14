module.exports = {
	clientId: '232a8f6747152e6eae6f',
  gatekeeperUrl: 'http://localhost:3000',
  repo: {
  	name: '9dots.io',
  	branch: 'master',
  	path: 'lib/markdown/src'
  },
  userRepo: {
  	name: '9dots.io-pages',
  	branch: 'master',
  	path: '',
  	homepage: '9dots.io',
  	description: '9dots.io pages'
  },

  hook: {
	  "name": "web",
	  "active": true,
	  "events": [
	    "push"
	  ],
	  "config": {
	    "content_type": "json"
	  }
	},

  server: 'http://9dots.io',

  dev: {
    userRepo: {
      name: '9dots.io-pages-dev'
    },
    server: 'http://76.168.229.78:3500'
  }
};