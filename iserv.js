process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var http = require('http');
var request = require("request").defaults({jar: true});
var htmlparser = require("htmlparser2");
var select = require('soupselect').select;
var Q = require("q");
var iconv = require("iconv-lite");

var data = require("./api.js").data()

exports.getDates = function(){
  var dates = new Array();
  var deferred = Q.defer();
  var selector = 'nav.php?p=Pl%C3%A4ne&amp;SIG=';
  var secondSelector = 'nav.php?p=Pl%C3%A4ne%2FVertretungsplan&amp;SIG=';
  var thirdSelector = 'plan/index.php/Vertretungsplan/';
  var firstHref = '';
  var secondHref = '';

  //first Handler because of the structure of the nav
  var firstDateHandler = new htmlparser.DomHandler(function(err, dom){
    if(err){
      console.log(err)
      deferred.reject(err)
    }else{
      //get all links
      var links = select(dom, 'a');
      links.forEach(function(link){
        if(link.name === 'a' && link.attribs.href.indexOf(selector) > -1){
          //only return the signature
          firstHref = link.attribs.href.split(';');
        }
      });
    }
  });

  //second Handler because of the structure of the nav
  var secondDateHandler = new htmlparser.DomHandler(function(err, dom){
    if(err){
      console.error(err);
      deferred.reject(err)
    }else{
      //get all links
      var links = select(dom, 'a');
      links.forEach(function(link){
        if(link.name === 'a' && link.attribs.href.indexOf(secondSelector) > -1){
          //only return the signature
          secondHref = link.attribs.href.split(';');
        }
      });
    }
  });

  //third Handler because of the structure of the nav
  var thirdDateHandler = new htmlparser.DomHandler(function(err, dom){
    if(err){
      console.error(err);
      deferred.reject(err)
    }else{
      //get all links
      var links = select(dom, 'a');
      links.forEach(function(link){
        if(link.attribs.href.indexOf(thirdSelector) > -1){
          //return the formated date and the identifier in the URL e.g.S-2015-5-18.htm
          dates.push({'href': link.attribs.href.split('/')[3], 'date': link.children[1].data});
        }
      });
    }
  });

  //first request
  request.post({url: 'https://ohmoor.de/idesk/', form: data}, function(err, httpResponse,body){
    if(err || httpResponse.statusCode != 302){
      deferred.reject(err)
    }else{
      //if first request(auth) was succesfull second request
      request.get({url:'https://ohmoor.de/idesk/nav.php'}, function(err,httpResponse, body){
        if(err||httpResponse.statusCode != 200){
          deferred.reject(err);
        }else{
          //get the signature
          new htmlparser.Parser(firstDateHandler).parseComplete(body);
          //if second request -> third request
          request.get({url: 'https://ohmoor.de/idesk/nav.php?p=Pl%C3%A4ne&' + firstHref[1]}, function(err, httpResponse, body){
            if(err){
              deferred.reject(err);
            }else{
              //get the signature
              new htmlparser.Parser(secondDateHandler).parseComplete(body);
              //if third request -> fourth request
              request.get({url:'https://ohmoor.de/idesk/nav.php?p=Pl%C3%A4ne%2FVertretungsplan&' + secondHref[1]}, function(err, httpResponse, body){
                if(err){
                  deferred.reject(err);
                }else{
                  //get the date and the identifier
                  new htmlparser.Parser(thirdDateHandler).parseComplete(body);
                  //resolve the promise
                  deferred.resolve(dates);
                }
              });
            }
          });
        }
      });
    }
  });
  // return promise for later resolving -> q
  return deferred.promise
}

exports.getLatestPlan = function(href){
  var items = new Object();
  items.href = href;
  items.msg = new Array();
  var deferred = Q.defer()

  //handler for getting all items from specified plan
  var handler = new htmlparser.DomHandler(function(err, dom) {
    if (err) {
      console.log("Error: " + err);
      deferred.reject(err)
    } else {
      //get the date
      var date = select(dom, '.mon_title')[0].children[0].data;
      items.date = date;

      var msgOD = select(dom ,'.info');
      for(index in msgOD){
        if(msgOD[index].name == 'td'){
          for(child in msgOD[index].children){
            if(msgOD[index].children[child].type != 'tag'){
              items.msg.push(msgOD[index].children[child].data);
            }
          }
        }
      }
      //get all items from the list
      var allItems = select(dom, '.mon_list tr.list');
      var counter = 0;
      items.items = [];
      //loop over all items to get single data
      allItems.forEach(function(itemCollection){
        // don't include the first two entrys because their describition -> not needed
        if(counter > 2){
          var filteredColl = new Object();
          var exCounter = 0;
          function removeEmptySign(data){
            if(data != "&nbsp;"){
              return data;
            }else{
              return "";
            }
          }
          // loop over the items not including first 2
          itemCollection.children.forEach(function(item){
            //switch for getting the single item in the collection
            switch(exCounter){
              case 0:
              filteredColl.klasse = removeEmptySign(item.children[0].data);
              break;
              case 1:
              filteredColl.stunde =  removeEmptySign(item.children[0].data);
              break;
              case 2:
              filteredColl.vertreter = removeEmptySign(item.children[0].data);
              break;
              case 3:
              filteredColl.lehrer =  removeEmptySign(item.children[0].data);
              break;
              case 4:
              filteredColl.fach =  removeEmptySign(item.children[0].data);
              break;
              case 5:
              filteredColl.normRaum = removeEmptySign(item.children[0].data);
              break;
              case 6:
              filteredColl.raum =  removeEmptySign(item.children[0].data);
              break;
              case 7:
              filteredColl.info =  removeEmptySign(item.children[0].data);
              break;
            }
            exCounter++;
          })
          //push the collectoin in the final array
          items.items.push(filteredColl);
        }
        counter++;
      })
    }
  });

  //first request (auth)
  request.post({url:'https://ohmoor.de/idesk/', form: data}, function(err,httpResponse,body){
    if(err || httpResponse.statusCode != 302){
      deferred.reject(err)
    }else{
      //if first then second
      request.get({url:'https://ohmoor.de/idesk/plan/index.php/Vertretungsplan/' + href, encoding: null}, function(err, httpResponse,body){
        if(err || httpResponse.statusCode != 200){
          deferred.reject(err)
        }else{
          var bodyWithCorrectEncoding = iconv.decode(body, 'iso-8859-1');
          //get all the items
          new htmlparser.Parser(handler).parseComplete(bodyWithCorrectEncoding);
          //resolve the promise
          deferred.resolve(items)
        }
      });
    }
  });
  //return promise for later resolve see q
  return deferred.promise;
  //return items;
}
