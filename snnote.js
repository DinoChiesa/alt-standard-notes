// snnote.js
// ------------------------------------------------------------------
//

var sncrypto = require('./sncrypto.js');
var merge = require('merge');

function newNoteTitle() {
  return "New Note " + (new Date().toISOString());
}

function SNNote(noteText, title) {
  this.text = noteText;
  this.title = title || newNoteTitle();
  this.uuid = sncrypto.generateUUID();
  this.created_at = (new Date()).toISOString();
}

SNNote.prototype.structureParams = function() {
  var params = {
        title: this.title,
        text: this.text
      };
    return params;
};

SNNote.prototype.getEncryptedForm = function(keys) {
  var theItem = this;
  var itemInEncryptedForm = sncrypto.encryptItem(theItem, keys);
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
