// readNotes.js
// ------------------------------------------------------------------
//
// read notes stored in standard notes for a particular user.
//

/* jshint esversion: 6, node: true, strict: false, camelcase : false */
/* global process, console */

const sn           = require('alt-standard-notes'),
      netrc        = require('netrc')(),
      sprintf      = require('sprintf-js').sprintf,
      readlineSync = require('readline-sync'),
      url          = require('url'),
      version      = '20181126-1115';

var options = {tryUseNetRc : true, quiet : false, email : null};

function getPassword() {
  let baseUrl = sn.getDefaultBaseUrl();
  if (options.tryUseNetRc) {
    var parsedUrl = url.parse(baseUrl);
    if ( netrc[parsedUrl.hostname]) {
      return netrc[parsedUrl.hostname].password;
    }
  }
  return readlineSync.question(sprintf('Password for %s [%s]: ', options.email, baseUrl), { hideEchoBack: true });
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
        return new Promise( (resolve) => {
          sn.readNotes(connection, { limit: BATCH_SIZE, cursor_token: cursor_token} )
            .then ( (result) => {
              process.stdout.write('.');
              result.retrieved_items.forEach( (item) => {
                if (item.content_type === 'Note' && !item.deleted && item.content) {
                  if (showOne) {
                    console.log('read item: ' + JSON.stringify(item));
                    showOne = false;
                  }
                  var content = JSON.parse(item.content);
                  aggregated[item.uuid] = {
                    title:content.title || '??',
                    updated_at: item.updated_at,
                    client_updated_at: content.appData['org.standardnotes.sn'].client_updated_at
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

function byNamedProperty(property, all) {
  return (key1, key2) => {
    let a = all[key1], b = all[key2];
    if (a[property] < b[property]) {
      return -1;
    }
    if (a[property] > b[property]) {
      return 1;
    }
    return 0;
  };
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
      else {
        usage();
      }
      awaiting = false;
      break;
    }
  });

  if ( ! options.quiet) {
    console.log(
      'StandardNotes readNotes tool, version: ' + version + '\n' +
        'Node.js ' + process.version + '\n');
  }

  sn.signin({email:options.email, getPasswordFn: getPassword})
    .then( readAllRecords )
    .then( (all) => {
      console.log('\nretrieved %d items', Object.keys(all).length);
      let maxTitleLength = 0;
      Object.keys(all)
        .forEach( (key) => {
          var item = all[key];
          if (item.title.length > maxTitleLength) {
            maxTitleLength = item.title.length;
          }
        });
      let formatStr = sprintf('%%3d. %%-%ds  %%-24s   %%-24s', maxTitleLength);
      Object.keys(all)
        .sort( byNamedProperty('client_updated_at', all) )
        .forEach( (key, ix) => {
          var item = all[key];
          console.log(sprintf(formatStr, ix + 1, item.title, item.client_updated_at, item.updated_at ));
        });
    })
    .catch( (error) => {
      console.log('error: ' + JSON.stringify(error));
    });
}

main(process.argv.slice(2));
