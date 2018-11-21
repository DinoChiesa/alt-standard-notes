// credential-stash.js
// management of user tokens for Standard notes.
// ------------------------------------------------------------------
/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

const path           = require('path'),
      fs             = require('fs'),
      os             = require('os'),
      credStashFile = path.join(os.homedir(), '.standard-notes-creds');

var stashedCreds;

module.exports = {
  getCredential,
  readCredentialStash,
  stashCredential  
};

// function expiry(token) {
//   return token.issued_at + (token.expires_in * 1000);
// }

function isValid(cred) {
  if (cred.token ) {
    return true; // valid
  }
  return false;
  // var now = (new Date()).getTime();
  // var tokenExpiry = expiry(token);
  // var adjustmentInMilliseconds = 30 * 1000;
  // var adjustedNow = now + adjustmentInMilliseconds;
  // var invalidOrExpired = (tokenExpiry < adjustedNow);
  // return invalidOrExpired;
}

function readCredentialStash() {
  if (stashedCreds) {
    return stashedCreds;
  }
  if (fs.existsSync(credStashFile)) {
    stashedCreds = JSON.parse(fs.readFileSync(credStashFile, 'utf8'));
    return stashedCreds;
  }
  return null;
}

function getStashKey(user, serverUrl) {
  return user + '##' + serverUrl;
}

function getCredential(user, serverUrl) {
  var creds = readCredentialStash();
  var key = getStashKey(user, serverUrl);
  var userEntry = creds && creds[key];
  return userEntry;
}

function stashCredential(user, serverUrl, newCredential) {
  var creds = readCredentialStash();
  if ( ! creds) { creds = {}; }
  var key = getStashKey(user, serverUrl);
  creds[key] = newCredential;  // possibly overwrite existing entry

  // keep only unexpired tokens
  creds = Object.keys(creds)
          .filter( key => isValid(creds[key]) )
          .reduce( (res, key) => (res[key] = creds[key], res), {} );
  fs.writeFileSync(credStashFile, JSON.stringify(creds, null, 2));
  fs.chmodSync(credStashFile, '600');
  stashedCreds = creds;
  return creds;
}
