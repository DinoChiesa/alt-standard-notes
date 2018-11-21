# alt-standard-notes

This is an improved wrapper of standardnotes for nodejs.
The goal is to support command-line tools that can read and write to the Standard notes server.

The library published for sfjs at
https://github.com/standardfile/sfjs
is not usable from nodejs, in my experience. It lacks documentation, it lacks examples.

## ES6 Promises

This library uses ES6 Promises.

## Sign-in

This is what it looks like to sign in and post a note.

```
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
* authenticates (calls /auth/sign_in)
* returns the generated keys and the secure token
* caches the result

## Saving a note

To insert (and save) a new note, call
`sn.insertNote(connection, note)`

It returns a promise.

To instantiate a note in memory,
```
  var note = new sn.Note("this is the text of the new note.",
                           "Note Title here");

```


To instantiate a note, with an auto-generated title:

```
  var note = new sn.Note("this is the text of the new note.");

```

Your program then needs to call insertNote in order to save it in the cloud.


## Bugs

* There are no tests
* There is no function to get an existing note
