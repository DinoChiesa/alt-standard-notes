// readNotes.js
// ------------------------------------------------------------------
//
// read notes stored in standard notes for a particular user
//
// created: Wed Oct 18 18:52:53 2017
// last saved: <2018-November-26 11:15:14>

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

const sn           = require('alt-standard-notes'),
      netrc        = require('netrc')(),
      util         = require('util'),
      sprintf      = require('sprintf-js').sprintf,
      readlineSync = require('readline-sync'),
      url          = require('url'),
      version      = '20181126-1115';

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

function readAllRecords(connection) {
  var aggregated = {};
  var showOne = false;
  const BATCH_SIZE = 125;
  let readBatch = function(cursor_token) {
        return new Promise( (resolve, reject) => {
          sn.readNotes(connection, { limit: BATCH_SIZE, cursor_token: cursor_token} )
            .then ( (result) => {
              result.retrieved_items.forEach( (item, ix) => {
                if (item.content_type == "Note" && !item.deleted && item.content) {
                  if (showOne) {
                    console.log('read item: ' + JSON.stringify(item));
                    showOne = false;
                  }
                  var content = JSON.parse(item.content);
                  aggregated[item.uuid] = {
                    title:content.title || '??',
                    updated_at: item.updated_at,
                    client_updated_at: content.appData["org.standardnotes.sn"].client_updated_at
                  };
                }
              });
              if (result.cursor_token) {
                return resolve(readBatch(result.cursor_token) );
              }
              return resolve(aggregated);
            });
        });
      };

  return readBatch(null);
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

  var p = sn.signin({email:email, getPasswordFn: getPassword})
    .then( readAllRecords )
    .then( (all) => {
      try {
        console.log('retrieved %d items', Object.keys(all).length);
        Object.keys(all)
          .sort( (key1, key2) => {
            let a = all[key1], b = all[key2];
            if (a.client_updated_at < b.client_updated_at)
              return -1;
            if (a.client_updated_at > b.client_updated_at)
              return 1;
            return 0;
          })
          .forEach( (key, ix) => {
            var item = all[key];
            console.log(sprintf('%3d. %-48s  %-24s   %-24s', ix + 1, item.title, item.client_updated_at, item.updated_at ));
          });
      }
      catch (exc) {
        console.log('exception: ' + exc);
      }
    })

    .catch( (error) => {
      console.log('error: ' + JSON.stringify(error));
    });

}



main(process.argv.slice(2));