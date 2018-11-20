// addOneNote.js
// ------------------------------------------------------------------
//
// add one note to standard notes for a user from sync.standardnotes.org
//
// created: Wed Oct 18 18:52:53 2017
// last saved: <2018-November-20 12:40:53>

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

const sn           = require('alt-standard-notes'),
      netrc        = require('netrc')(),
      util         = require('util'),
      readlineSync = require('readline-sync'),
      url          = require('url'),
      version      = '20181120-1236';

var tryUseNetRc = true;
var email = null;

function contriveNote() {
  var note = new sn.SNNote("this is the text of the new note.");
  return note;
}

function getPassword() {
  let baseUrl = sn.getBaseUrl();
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
  console.log('usage:\n  %s --email xxx@example.org [--nonetrc]', path.basename(process.argv[1]));
  process.exit(1);
}

function postNote

console.log(
  'StandardNotes addOneNote tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

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

  sn.signin(email, getPassword)
    .then( (signinResult) => {
      return sn.postNewNote(contriveNote(), signinResult.keys, signinResult.token);
    })
    .then( (result) => {
      console.log('post result: ' + JSON.stringify(result));
    })
    .catch( (error) => {
      console.log('error: ' + JSON.stringify(error));
    });

}



main(process.argv.slice(2));
