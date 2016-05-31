## Iserv Vertretungsplan

Server for accessing ohmoor.de/idesk/ and getting all entrys in the Vertretungsplan.
No support!

### Usage
Create a file called api.js with the following entrys:
```
exports.data = function(){
  var obj = {
    login_act: "username",
    login_pwd: "password"
  }
  return obj;
}
exports.key = function(){
  return "api_key"
}
```

### license
MIT
