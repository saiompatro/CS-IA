rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /clientEntries/{clientId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}