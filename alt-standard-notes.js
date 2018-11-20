// alt-standard-notes.js
// ------------------------------------------------------------------

// I found the standard-file-js library available at
// https://github.com/standardfile/sfjs to be unusable from a nodejs command
// line app.  The doc is completely inadequte, almost absent.  What is available
// is inaccurate and lacks context. Fiddling around with it was a waste of time.
//
// This module actually works, simply. 

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

'use strict';

const debug    = require('debug')('alt-standard-notes'), 
      util     = require('util'),
      request  = require('request');

const SNNote   = require ('./snnote.js'),
      sncrypto = require ('./sncrypto.js');

var baseUrl = 'https://sync.standardnotes.org';

function setBaseUrl(newUrl) {
  baseUrl = newUrl;
}

function getBaseUrl() {
  return baseUrl;
}

function getAuthParams(email) {
  return new Promise(function(resolve, reject) {
    var options = {
          method:'GET',
          uri:util.format('%s/auth/params?email=%s', baseUrl, email),
          gzip:true
        };
    request(options, function (error, response, body) {
      if (error) {
        debug('exception while getting auth params');
        return reject(error);
      }
      var authConfig = JSON.parse(body);
      return ( authConfig.error ) ? reject(authConfig.error) : resolve(authConfig);
    });
  });
}

function signin(email, getPasswordFn) {
  return new Promise( (resolve, reject) => {
    var allKeys;
    getAuthParams(email)
      .then( (authParams) => {
        debug('received authParams: ' + JSON.stringify(authParams, null, 2));
        return sncrypto.computeEncryptionKeysForUser(getPasswordFn(), authParams);
      })
      .then( (keys) => {
        debug('keys: ' + JSON.stringify(keys));
        allKeys = keys;
        return authenticate(email, keys.pw);
      })
      .then( (signinResult) => {
        debug('signin result: ' + JSON.stringify(signinResult));
        signinResult.keys = allKeys;
        return resolve(signinResult);
      })
      .catch( (error) => {
        return reject(error);
      });
  });
}

function authenticate(email, password) {
  return new Promise( (resolve, reject) => {
    var params = {email : email, password: password};
    var options = { method:'POST', uri:util.format('%s/auth/sign_in', baseUrl), gzip:true, json:params, headers:{ 'content-type':'application/json' }};
    request(options, function (error, response, body) {
      if (error) {
        debug('exception during sign_in');
        return reject(error);
      }
      debug('auth response: ' + JSON.stringify(body, null, 2));
      if (body.error || ! body.token ){
        return reject(body.error || 'no token, cannot continue.');
      }
      return resolve({token:body.token});
    });
  });
}

function postNewNote(rawNote, keys, token) {
  return new Promise( (resolve, reject) => {
    var payload = {limit: 10, items: [ rawNote.getEncryptedForm(keys) ]};
    var headers = { 'content-type': 'application/json', authorization: 'Bearer ' + token };
    var options = { method:'POST', uri:util.format('%s/items/sync', baseUrl), gzip:true, headers:headers, json:payload };
    request(options, function (error, response, body) {
      if (error) {
        debug('exception during notes sync');
        return reject(error);
      }
      return resolve(body);
    });
  });
}

module.exports = {
  getAuthParams,
  computeEncryptionKeysForUser: sncrypto.computeEncryptionKeysForUser, 
  signin,
  authenticate, 
  postNewNote,
  SNNote, 
  setBaseUrl, 
  getBaseUrl
};
