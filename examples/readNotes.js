// readNotes.js
// ------------------------------------------------------------------
//
// read notes stored in standard notes for a particular user, and optionally save a decrypted copy of them.
//

/* jshint esversion: 6, node: true, strict: false, camelcase : false */
/* global process, console */

const sn           = require('alt-standard-notes'),
      netrc        = require('netrc')(),
      sprintf      = require('sprintf-js').sprintf,
      readlineSync = require('readline-sync'),
      url          = require('url'),
      path         = require('path'),
      version      = '20190123-1047';

var options = {tryUseNetRc:true, quiet:false, email:null, save:false, showOne:false};

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
  console.log('usage:\n  %s --email xxx@example.org [--nonetrc] [--quiet] [--save]', path.basename(process.argv[1]));
  process.exit(1);
}

function getClientUpdatedAt(item) {
  return item.content.appData['org.standardnotes.sn'].client_updated_at;
}

function byClientUpdatedAt(item1, item2) {
  var a = getClientUpdatedAt(item1),
      b = getClientUpdatedAt(item2);
  if (a < b) {
    return -1;
  }
  return (a > b) ? 1: 0;
}

function maybeSerializeAllRecords(allNotesAndTags) {
  if (options.save) {
  const dateformat   = require('dateformat'),
        fs           = require('fs'),
        now          = dateformat(new Date(), 'yyyymmmdd-HHMMss') + 'UTC',
        dataFilename = path.join('./',
                                 sprintf('standardnotes-snapshot-%s-%s.json', options.email, now));
  fs.writeFileSync(dataFilename, JSON.stringify(allNotesAndTags));
    if ( ! options.quiet) {
      console.log('\nSaved file %s', dataFilename);
    }
  }
}

function maybeShowAllRecords(allNotesAndTags) {
  if ( options.quiet) {
    return allNotesAndTags;
  }
  let allnotes = allNotesAndTags.filter((item) => (item.content_type === 'Note' && !item.deleted && item.content) );
  console.log('\nretrieved %d items', Object.keys(allnotes).length);
  let maxTitleLength = 0;
  allnotes
    .forEach( (item) => {
      if (item.content.title.length > maxTitleLength) {
        maxTitleLength = item.content.title.length;
      }
    });
  let formatStr = sprintf('%%3d. %%-%ds  %%-24s   %%-24s', maxTitleLength);
  allnotes
    .sort( byClientUpdatedAt )
    .forEach( (item, ix) => {
      console.log(sprintf(formatStr, ix + 1,
                          item.content.title,
                          item.content.appData['org.standardnotes.sn'].client_updated_at,
                          item.updated_at ));
    });
  return allNotesAndTags;
}

function readAllRecords(connection) {
  var aggregated = [];
  var showOne = options.showOne;
  const BATCH_SIZE = 125;
  let readBatch = function(cursor_token) {
        return new Promise( (resolve) => {
          sn.readNotes(connection, { limit: BATCH_SIZE, cursor_token: cursor_token} )
            .then ( (result) => {
              if ( ! options.quiet) {
                process.stdout.write('.');
              }
              result.retrieved_items.forEach( (item) => {
                if (item.content_type === 'Note' && !item.deleted && item.content) {
                  if (showOne) {
                    console.log('read item: ' + JSON.stringify(item));
                    showOne = false;
                  }
                  item.content = JSON.parse(item.content);
                }
              });
              aggregated = aggregated.concat(result.retrieved_items);
              if (result.cursor_token) {
                return resolve( readBatch(result.cursor_token) );
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
      options.tryUseNetRc = false;
      break;

    case '--save':
      options.save = true;
      break;

    case '--showOne':
      options.showOne = true;
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

  if ( ! options.email) {
    console.log('you must specify --email');
    usage();
  }

  sn.signin({email:options.email, getPasswordFn: getPassword})
    .then( readAllRecords )
    .then( maybeShowAllRecords )
    .then( maybeSerializeAllRecords )
    .catch( (error) => {
      console.log('error: ' + error.stack);
    });
}

main(process.argv.slice(2));
