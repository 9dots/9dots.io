#!/usr/bin/env node

/**
 * Module dependencies.
 */

var program = require('commander')
  , app = require('..')

// options

program
  .option('-p, --port <n>', 'set port number [3000]', parseInt)
  .parse(process.argv);

// title

process.title = '9dots.io';

// listen

var port = program.port || process.env.PORT || 3000;
app.listen(port);
console.log('application listening on port %d', port);