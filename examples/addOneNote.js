// addOneNote.js
// ------------------------------------------------------------------
//
// add one note to standard notes for a user from sync.standardnotes.org
//

/* jshint esversion: 6, node: true, strict: false, camelcase: false */
/* global process, console, Buffer */

const sn           = require('alt-standard-notes'),
      netrc        = require('netrc')(),
      util         = require('util'),
      readlineSync = require('readline-sync'),
      url          = require('url'),
      version      = '20181120-1550';

var options = {tryUseNetRc : true, quiet : false, email : null};

function contriveNote() {
  var note = new sn.Note(options.text || 'this is the text of the new note.');
  return note;
}

function getPassword() {
  let baseUrl = sn.getDefaultBaseUrl();
  if (options.tryUseNetRc) {
    var parsedUrl = url.parse(baseUrl);
    if ( netrc[parsedUrl.hostname]) {
      return netrc[parsedUrl.hostname].password;
    }
  }
  return readlineSync.question(util.format('Password for %s [%s]: ', options.email, baseUrl), { hideEchoBack: true });
}

function usage() {
  var path = require('path');
  console.log('usage:\n  %s --email xxx@example.org [--nonetrc] [--quiet] [--text "text of note here"]', path.basename(process.argv[1]));
  process.exit(1);
}

function main(args) {
  var awaiting = null;
  args.forEach(function(arg){
    switch (arg) {

    case '--email':
      awaiting = 'email';
      break;

    case '--nonetrc':
      options.tryUseNetRc = false;
      break;

    case '--text':
      awaiting = 'text';
      break;

    case '--quiet':
      options.quiet = true;
      break;

    case '--help':
      usage();
      break;

    default:
      if (awaiting === 'email') {
        options.email = arg;
      }
      else if (awaiting === 'text') {
        options.text = arg;
      }
      else {
        usage();
      }
      awaiting = false;
      break;
    }
  });

  if ( ! options.quiet) {
    console.log(
      'StandardNotes addOneNote tool, version: ' + version + '\n' +
        'Node.js ' + process.version + '\n');
  }

  sn.signin({email:options.email, getPasswordFn: getPassword})
    .then( (connection) => sn.insertNote(connection, contriveNote()) )
    .then( (result) => {
      //console.log('post result: ' + JSON.stringify(result));
      console.log('OK.');
    })
    .catch( (error) => {
      console.log('uncaught error: ' + error.stack);
    });
}

main(process.argv.slice(2));
