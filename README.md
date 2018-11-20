# alt-standard-notes

This is an improved wrapper of standardnotes for nodejs.
The goal is to support command-line tools that can read and write to the Standard notes server.

The library published for sfjs at
https://github.com/standardfile/sfjs
is not usable from nodejs, in my experience. It lacks documentation, it lacks examples.


## Sign-in

This is the higher-level way of signing in and posting a note.

```
sn.signin(email, getPassword)
  .then( (signinResult) => {
    var newnote = getNewNote();
    sn.postNewNote(
      newnote.getEncryptedForm(signinResult.keys), signinResult.token)
      .then ((result) => {
        console.log('post result: ' + JSON.stringify(result));
      });
  })
  .catch((error) => {
    console.log('error: ' + JSON.stringify(error));
  });

```


This is the lower-level way of signing in and posting a note.

```
sn.getAuthParams(email)
  .then((authParams) => {
    sn.computeEncryptionKeysForUser(getPassword(), authParams)
      .then((keys) => {
        console.log('keys: ' + JSON.stringify(keys));
        sn.authenticate(email, keys.pw)
          .then ((signinResult) => {
            console.log('signin result: ' + JSON.stringify(signinResult));
            sn.postNewNote(
              contriveNote().getEncryptedForm(keys), signinResult.token)
              .then ((result) => {
                console.log('post result: ' + JSON.stringify(result));
              });
          });
      });
  })
  .catch((error) => {
    console.log('error: ' + JSON.stringify(error));
  });
```