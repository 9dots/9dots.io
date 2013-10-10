module.exports = {
  clientId: '587fbc93e17fa1bc9497',
  gatekeeperUrl: 'http://www.9dots.io',
  repo: {
  	name: '9dots.io',
  	branch: 'master',
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

  server: 'http://www.9dots.io',
  backend: 'http://backend.9dots.io',
  uploads: 'http://uploads.9dots.io',
  posts: 'http://posts.9dots.io',

  dev: {
    gatekeeperUrl: 'http://localhost:3000',
    clientId: '232a8f6747152e6eae6f',
    userRepo: {
      name: '9dots.io-pages-dev'
    },
    server: 'http://76.168.229.78:3000',
    backend: 'http://76.168.229.78:1337'
  }
};