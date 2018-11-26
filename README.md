# alt-standard-notes

This is an improved wrapper of standardnotes for nodejs.
The goal is to support command-line tools that can read and write to the Standard notes server.

The alternative, a library published for sfjs at
https://github.com/standardfile/sfjs
is not usable from nodejs, in my experience. It lacks documentation, it lacks examples.

## Note

This library uses ES6 Promises.

## Sign-in

This is what it looks like to sign in and post a note.

```js
  const sn = require('alt-standard-notes');

  function getPassword() { return "the password"; }

  sn.signin({email:email, getPasswordFn: getPassword})
    .then( (connection) => sn.insertNote(connection, contriveNote()) )
    .then( (result) => {
      console.log('post result: ' + JSON.stringify(result));
    })
    .catch( (error) => {
      console.log('error: ' + JSON.stringify(error));
    });

```

The `signin` function:
* looks in a file-based cache for existing credentials, returns them if found.
* else, obtains auth params
* computes encryption keys for the user
* authenticates (`POST /auth/sign_in`)
* returns the generated keys and the secure token
* caches the result

## Saving a note

To insert (and save) a new note, call
`sn.insertNote(connection, note)`

It returns a Promise.

To instantiate a note in memory,
```js
  var note = new sn.Note("this is the text of the new note.",
                         "Note Title here");

```


To instantiate a note with an auto-generated title:

```js
  var note = new sn.Note("this is the text of the new note.");

```

Your program then needs to call `sn.insertNote` in order to save it in the cloud.

## Retrieving Notes

To retrieve existing notes, 
```js
 sn.readNotes(connection, { limit: BATCH_SIZE, cursor_token: cursor_token} )

```
It returns a Promise that resolves to an object that has a `retrieved_items` member.
Read items in batches. Specify the batch size on the read, and specify the cursor. If you don't specify a cursor, 
the results atart at the beginning. Retrieved items are not defined to be sorted in any particular order. Items are 
distinguished by uuid, and multiple batches may include the same note. 
Example: 

```js
function readAllRecords(connection) {
  var aggregated = {};
  const BATCH_SIZE = 125;
  let readBatch = function(cursor_token) {
        return new Promise( (resolve) => {
          sn.readNotes(connection, { limit: BATCH_SIZE, cursor_token: cursor_token} )
            .then ( (result) => {
              result.retrieved_items.forEach( (item) => {
                if (item.content_type === 'Note' && !item.deleted && item.content) {
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
```

`sn.readNotes` is really a misnomer. It reads tags as well as Notes. 

## Bugs

* There are no tests
* There is no function to get an existing note by uuid
* There is no fulltext search function
* `sn.readNotes` is really a misnomer. It reads tags and Notes. 
