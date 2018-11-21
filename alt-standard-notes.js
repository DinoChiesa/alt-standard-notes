// alt-standard-notes.js
// ------------------------------------------------------------------

// I found the standard-file-js library available at
// https://github.com/standardfile/sfjs to be unusable from a nodejs command
// line app. The doc is completely inadequte, almost absent.  What is available
// is inaccurate and lacks context. Fiddling around with it was a waste of time.
//
// This module actually works, simply. 

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

'use strict';

const debug    = require('debug')('alt-standard-notes'), 
      util     = require('util'),
      request  = require('request');

const Note     = require ('./snnote.js'),
      sncrypto = require ('./sncrypto.js'), 
      credStash = require ('./credential-stash.js');

const DefaultBaseUrl = 'https://sync.standardnotes.org';

function getDefaultBaseUrl() {
  return DefaultBaseUrl;
}

function getAuthParams(conn) {
  return new Promise(function(resolve, reject) {
    debug('getAuthParams(): ' + conn.getEmail());
    var options = {
          method:'GET',
          uri:util.format('%s/auth/params?email=%s', conn.getBaseUrl(), conn.getEmail()),
          gzip:true
        };
    request(options, function (error, response, body) {
      if (error) {
        debug('exception while getting auth params');
        return reject(error);
      }
      var authParams = JSON.parse(body);
      if  ( authParams.error ) {
        return reject(authParams.error) ;        
      }
      return resolve(authParams);
    });
  });
}

function authenticate(conn, keys) {
  return new Promise( (resolve, reject) => {
    var params = {email : conn.getEmail(), password: keys.pw};
    var options = {
          method:'POST',
          uri:util.format('%s/auth/sign_in', conn.getBaseUrl()),
          gzip:true, json:params,
          headers:{ 'content-type':'application/json' }
        };
    request(options, function (error, response, body) {
      if (error) {
        debug('exception during sign_in');
        return reject(error);
      }
      debug('auth response: ' + JSON.stringify(body, null, 2));
      if (body.error || ! body.token ){
        return reject(body.error || 'no token, cannot continue.');
      }
      return resolve(body.token);
    });
  });
}

function upsertNote(conn, rawNote) {
  return new Promise( (resolve, reject) => {
    var payload = { limit: 10, items: [ rawNote.getEncryptedForm(conn.getKeys()) ]};
    var headers = { 'content-type': 'application/json', authorization: 'Bearer ' + conn.getToken() };
    var options = {
          method:'POST',
          uri:util.format('%s/items/sync', conn.getBaseUrl()),
          gzip:true,
          headers:headers,
          json:payload
        };
    request(options, function (error, response, body) {
      if (error) {
        debug('exception during notes sync');
        return reject(error);
      }
      
      return resolve(body);
    });
  });
}

function readNotes(conn, options) {
  return new Promise ( (resolve, reject) => {
    var payload = {
          limit: options.limit || 150,
          items: [],
          sync_token: null,
          cursor_token: options.cursor_token || null
        };
    var headers = { 'content-type': 'application/json', authorization: 'Bearer ' + conn.getToken() };
    var requestOptions = {
          method: 'POST',
          uri: util.format('%s/items/sync', conn.getBaseUrl()),
          gzip: true,
          headers:headers,
          json:payload
        };

    request(requestOptions, function (error, response, body) {
      if (error) {
        debug('exception during notes retrieval');
        return reject(error);
      }
      resolve(body);
    });
  });
}

function signin({ email, baseUrl, getPasswordFn }) {
  var conn = new Connection({email, baseUrl});
  
  return new Promise( (resolve, reject) => {
    var credential = credStash.getCredential(conn.getEmail(), conn.getBaseUrl());
    if (credential) {
      conn.setCredential(credential);
      return resolve(conn);
    }

    credential = {};
    getAuthParams(conn)
      .then( (authParams) => {
        credential.authParams = authParams;
        debug('signin received authParams: ' + JSON.stringify(authParams, null, 2));
        debug('signin getPasswordFn: ' + getPasswordFn);
        return sncrypto.computeEncryptionKeysForUser(getPasswordFn(), authParams);
      })
      .then( (keys) => {
        credential.keys = keys;
        debug('signin keys: ' + JSON.stringify(keys));
        return authenticate(conn, keys);
      })
      .then( (token) => {
        debug('signin result: ' + JSON.stringify(token));
        credential.token = token;
        conn.setCredential(credential);
        credStash.stashCredential(conn.getEmail(), conn.getBaseUrl(), credential);
        return resolve(conn);
      })
      .catch( (error) => {
        debug('signin catch: ' + JSON.stringify(error));
        return reject(error);
      });
  });
}

var Connection = (function (){
      var _email;
      var _baseUrl;
      var _authParams;
      var _credential;
      var Connection = function ({email, baseUrl}) {
        debug('new Connection for ' + email);
            _email = email;
            _baseUrl = baseUrl || DefaultBaseUrl;
          };
      // Connection.prototype.setAuthParams = function(authParams) {
      //   _authParams = authParams;
      //   return this;
      // };
      Connection.prototype.getAuthParams = function() { return _credential.authParams; };
      Connection.prototype.getKeys = function() { return _credential.keys; };
      Connection.prototype.getToken = function() { return _credential.token; };
      Connection.prototype.getEmail = function() { return _email; };
      Connection.prototype.getBaseUrl = function() { return _baseUrl; };
      Connection.prototype.setCredential = function(credential) {
        _credential = credential;
        return this;
      };
      return Connection;
    }());


module.exports = {
  signin,
  getDefaultBaseUrl, 
  upsertNote,
  insertNote : upsertNote,
  updateNote : upsertNote,
  readNotes,
  
  Note

};
