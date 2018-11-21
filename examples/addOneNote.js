// addOneNote.js
// ------------------------------------------------------------------
//
// add one note to standard notes for a user from sync.standardnotes.org
//
// created: Wed Oct 18 18:52:53 2017
// last saved: <2018-November-20 16:07:33>

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

const sn           = require('alt-standard-notes'),
      netrc        = require('netrc')(),
      util         = require('util'),
      readlineSync = require('readline-sync'),
      url          = require('url'),
      version      = '20181120-1550';

var tryUseNetRc = true;
var quiet = false;
var email = null;

function contriveNote() {
  var note = new sn.Note("this is the text of the new note.");
  return note;
}

function getPassword() {
  let baseUrl = sn.getDefaultBaseUrl();
  if (tryUseNetRc) {
    var parsedUrl = url.parse(baseUrl);
    if ( netrc[parsedUrl.hostname]) {
      return netrc[parsedUrl.hostname].password;
    }
  }
  return readlineSync.question(util.format('Password for %s [%s]: ', email, baseUrl), { hideEchoBack: true });
}

function usage() {
  var path = require('path');
  console.log('usage:\n  %s --email xxx@example.org [--nonetrc] [--quiet]', path.basename(process.argv[1]));
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
      tryUseNetRc = false;
      break;

    case '--quiet':
      quiet = true;
      break;

    case '--help':
      usage();
      break;

    default:
      if (awaiting == 'email') {
        email = arg;
      }
      else {
        usage();
      }
      break;
    }
  });

  if ( ! quiet) {
    console.log(
      'StandardNotes addOneNote tool, version: ' + version + '\n' +
        'Node.js ' + process.version + '\n');
  }

  sn.signin({email:email, getPasswordFn: getPassword})
    .then( (connection) => sn.insertNote(connection, contriveNote()) )
    .then( (result) => {
      console.log('post result: ' + JSON.stringify(result));
    })
    .catch( (error) => {
      console.log('error: ' + JSON.stringify(error));
    });

}



main(process.argv.slice(2));
