// sncrypto.js
// ------------------------------------------------------------------
//
// StandardNotes crypto stuff.
//
// See https://github.com/standardnotes/documentation/blob/master/client-development.md
//
// created: Thu Oct 19 09:25:57 2017
// last saved: <2018-November-20 16:34:39>

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

(function (){
  const CryptoJS = require('crypto-js'), 
        debug    = require('debug')('alt-standard-notes');
  
  const DefaultPBKDF2Length = 768;

  function generateRandomKey(bits) {
    return CryptoJS.lib.WordArray.random(bits/8).toString();
  }

  function generateItemEncryptionKey() {
    // Generates a key that will be split in half, each being 256 bits. So total length will need to be 512.
    let length = 512,
        cost = 1, 
        salt = generateRandomKey(length), 
        passphrase = generateRandomKey(length);
    return pbkdf2(passphrase, salt, cost, length);
  }
  
  function decryptText({ciphertextToAuth, contentCiphertext, encryptionKey, iv, authHash, authKey} = {}, requiresAuth) {
    if(requiresAuth && !authHash) {
      console.error("Auth hash is required.");
      return;
    }

    if (authHash) {
      var localAuthHash = hmac256(ciphertextToAuth, authKey);
      if(authHash !== localAuthHash) {
        console.error("Auth hash does not match, returning null.");
        return null;
      }
    }
    var keyData = CryptoJS.enc.Hex.parse(encryptionKey);
    var ivData  = CryptoJS.enc.Hex.parse(iv || "");
    var decrypted = CryptoJS.AES.decrypt(contentCiphertext, keyData, { iv: ivData,  mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }


  function generateRandomEncryptionKey() {
    var salt = generateRandomKey(512);
    var passphrase = generateRandomKey(512);
    return CryptoJS.PBKDF2(passphrase, salt, { keySize: 512/32 }).toString();
  }
  
  function firstHalfOfKey(key) {
    return key.substring(0, key.length/2);
  }

  function secondHalfOfKey(key) {
    return key.substring(key.length/2, key.length);
  }

  function base64(textString) {
    var words = CryptoJS.enc.Utf8.parse(textString);
    var base64 = CryptoJS.enc.Base64.stringify(words);
    return base64;
  }

  function base64Decode(base64String) {
    if ( ! base64String) return null;
    if (base64String.length == 0) return null;
    var words = CryptoJS.enc.Base64.parse(base64String);
    var textString = CryptoJS.enc.Utf8.stringify(words);
    return textString;
  }

  function pbkdf2(password, pw_salt, pw_cost, length) {
    var params = {
          keySize: length/32,
          hasher: CryptoJS.algo.SHA512,
          iterations: pw_cost
        };
    return CryptoJS.PBKDF2(password, pw_salt, params).toString();
  }

  function sha256(text) {
    return CryptoJS.SHA256(text).toString();
  }

  function hmac256(message, key) {
    var keyData = CryptoJS.enc.Hex.parse(key);
    var messageData = CryptoJS.enc.Utf8.parse(message);
    var result = CryptoJS.HmacSHA256(messageData, keyData).toString();
    return result;
  }

  function encryptText(text, key, iv) {
    var keyData = CryptoJS.enc.Hex.parse(key);
    var ivData  = CryptoJS.enc.Hex.parse(iv || "");
    var encrypted = CryptoJS.AES.encrypt(text, keyData, { iv: ivData,  mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    return encrypted.toString();
  }

  function __encryptString(string, encryptionKey, authKey, uuid, version) {
    var iv = generateRandomKey(128);
    var contentCiphertext = encryptText(string, encryptionKey, iv);
    var ciphertextToAuth = [version, uuid, iv, contentCiphertext].join(":");
    var authHash = hmac256(ciphertextToAuth, authKey);
    var fullCiphertext = [version, authHash, uuid, iv, contentCiphertext].join(":");
    return fullCiphertext;
  }


  function _private_encryptString(string, encryptionKey, authKey, uuid, auth_params) {
    var fullCiphertext, contentCiphertext;
    if(auth_params.version === "001") {
      contentCiphertext = encryptText(string, encryptionKey, null);
      fullCiphertext = auth_params.version + contentCiphertext;
    }
    else {
      var iv = generateRandomKey(128);
      contentCiphertext = encryptText(string, encryptionKey, iv);
      var ciphertextToAuth = [auth_params.version, uuid, iv, contentCiphertext].join(":");
      var authHash = hmac256(ciphertextToAuth, authKey);
      var authParamsString = base64(JSON.stringify(auth_params));
      fullCiphertext = [auth_params.version, authHash, uuid, iv, contentCiphertext, authParamsString].join(":");
    }

    return fullCiphertext;
  }
  
  // // https://github.com/standardnotes/web/blob/master/app/assets/javascripts/app/services/encryption/encryptionHelper.js
  // function encryptItem(item, keys) {
  //   var version = "002";
  //   var params = {};
  //   // encrypt item key
  //   var item_key = generateRandomEncryptionKey();
  //   params.enc_item_key = __encryptString(item_key, keys.mk, keys.ak, item.uuid, version);
  // 
  //   // encrypt content
  //   var ek = firstHalfOfKey(item_key);
  //   var ak = secondHalfOfKey(item_key);
  //   var ciphertext = __encryptString(JSON.stringify(item.structureParams()), ek, ak, item.uuid, version);
  //   params.content = ciphertext;
  //   return params;
  // }

  function encryptItem(item, keys, auth_params) {
    var params = {};
    // encrypt item key
    var item_key = generateItemEncryptionKey();
    if(auth_params.version === "001") {
      // legacy
      params.enc_item_key = encryptText(item_key, keys.mk, null);
    }
    else {
      params.enc_item_key = _private_encryptString(item_key, keys.mk, keys.ak, item.uuid, auth_params);
    }

    // encrypt content
    var ek = firstHalfOfKey(item_key);
    var ak = secondHalfOfKey(item_key);
    var ciphertext = _private_encryptString(JSON.stringify(item.createContentJSONFromProperties()), ek, ak, item.uuid, auth_params);
    if(auth_params.version === "001") {
      var authHash = hmac256(ciphertext, ak);
      params.auth_hash = authHash;
    }
    params.content = ciphertext;
    return params;
  }
  

  function generateSymmetricKeyPair(password, pw_salt, pw_cost) {
    var output = pbkdf2(password, pw_salt, pw_cost, DefaultPBKDF2Length);
    var outputLength = output.length;
    var splitLength = outputLength/3;
    var firstThird = output.slice(0, splitLength);
    var secondThird = output.slice(splitLength, splitLength * 2);
    var thirdThird = output.slice(splitLength * 2, splitLength * 3);
    return { pw:firstThird, mk:secondThird, ak: thirdThird};
  }

  function generateSalt({identifier, version, cost, nonce}) {
    var result = sha256([identifier, "SF", version, cost, nonce].join(":"));
    return result;
  }
  
  function computeEncryptionKeysForUser(password, authParams) {
    return new Promise( (resolve, reject) => {
      var pw_salt;

      if ( ! password ) { return reject("missing password"); }
      
      if (authParams.version == "003") {
        
        if (!authParams.identifier) {
          debug("authParams is missing identifier.");
          reject("missing identifier");
          return;
        }
        // Salt is computed from identifier + pw_nonce from server
        pw_salt = generateSalt(authParams);
      }
      else {
        // Salt is returned from server
        pw_salt = authParams.pw_salt;
      }

      let keys = generateSymmetricKeyPair(password, pw_salt, authParams.pw_cost);
      resolve(keys);
    });
  }
  

 module.exports = {
   generateRandomKey, 
   decryptText, 
   encryptText, 
   generateRandomEncryptionKey, 
   firstHalfOfKey, 
   secondHalfOfKey, 
   base64, 
   base64Decode, 
   sha256, 
   hmac256, 
   computeEncryptionKeysForUser, 
   encryptItem
 };

}());
