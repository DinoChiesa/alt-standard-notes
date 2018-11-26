// snnote.js
// ------------------------------------------------------------------
//

var sncrypto = require('./sncrypto.js');
var merge = require('merge');

function newNoteTitle() {
  return "New Note " + (new Date().toISOString());
}

function generateUUID() {
  var d = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
      });
  return uuid;
}

function SNNote(noteText, title) {
  this.text = noteText;
  this.title = title || newNoteTitle();
  this.uuid = generateUUID();
  this.created_at = (new Date()).toISOString();
  this.updated_at = (new Date()).toISOString();
}

SNNote.prototype.structureParams = function() {
  return { title: this.title, text: this.text };
};

SNNote.prototype.getEncryptedForm = function(keys, authParams) {
  var theItem = this;
  var itemInEncryptedForm = sncrypto.encryptItem(theItem, keys, authParams);
  return merge(itemInEncryptedForm, {
    uuid: this.uuid,
    content_type : "Note",
    deleted: false,
    created_at : this.created_at
  });
};

 SNNote.prototype.createContentJSONFromProperties = function() {
   return this.structureParams();
 };

module.exports = SNNote;
