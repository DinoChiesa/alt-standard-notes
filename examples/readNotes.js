// readNotes.js
// ------------------------------------------------------------------
//
// read notes stored in standard notes for a particular user
//
// created: Wed Oct 18 18:52:53 2017
// last saved: <2018-November-20 16:46:27>

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

const sn           = require('alt-standard-notes'),
      netrc        = require('netrc')(),
      util         = require('util'),
      sprintf      = require('sprintf-js').sprintf,
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
      'StandardNotes readNotes tool, version: ' + version + '\n' +
        'Node.js ' + process.version + '\n');
  }

  sn.signin({email:email, getPasswordFn: getPassword})
    .then( (connection) =>  sn.readNotes(connection, {limit:10}) )
    .then( (result) => {
      //console.log('read result: ' + JSON.stringify(result));
      console.log('retrieved %d items', result.retrieved_items.length);
      result.retrieved_items.forEach( (item, ix) => {
        if (item.content_type == "Note") {
          var content = {title:"unknown"};
          try {
            console.log('parse: ' + item.content);
            content = JSON.parse(item.content);
          }
          catch (e) {}
          console.log(sprintf('%3d. %-48s', ix, content.title || '??'));
        }
      });

      // "sync_token":"MjoxNTQyNzYwNTU4Ljc5NDM5Mg==\n","cursor_token":"MjoxNTMyMDI4MDk5LjAwMTY2NQ==\n"

    })
    .catch( (error) => {
      console.log('error: ' + JSON.stringify(error));
    });

}



main(process.argv.slice(2));
