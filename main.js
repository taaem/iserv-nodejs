var iserv = require("./iserv.js");
var Q = require("q");
var http = require("http");
var restify = require('restify');

var port = process.env.OPENSHIFT_NODEJS_PORT || 8000;
var host = process.env.OPENSHIFT_NODEJS_IP || "localhost";

var apiKey = require('./api.js').key();

var plan = [];
var dates;
var minutes = 10, lIntervall = minutes * 60 * 1000;

//loop over the request to update data
function loop(){
  // get all possible dates from iserv
  iserv.getDates().then(function(iDates){
    dates = iDates;
    console.log(getDateTime() + ': Updated Dates');
    // loop over every date to get the corresponding plan
    plan = [];
    dates.forEach(function(date){
      //get the plan from iserv
      data = iserv.getLatestPlan(date.href).then(function(data) {
        console.log(getDateTime() + ": Updated Data");
        plan.push(data);
      }).catch(function(err){
        console.log(err)
        loop();
      })
    })
    //set timeout for the loop
    setTimeout(function(){
      loop();
    }, lIntervall);
  })
  .catch(function(err){
    console.log(err)
    loop();
  })
}

//create server
var server = restify.createServer({});

// api request to /dates
server.get('/dates', function(req,res,next){
  // cehck if request is authorized
  if(req.headers["x-apikey"] == apiKey){
    res.send(dates)
  }else{
    res.send("Forbidden")
  }
});

server.get('/plan/:date', function(req, res, next){
  if(req.headers["x-apikey"] == apiKey){
    // Loop over all possible plans
    for (var j = 0; j < plan.length; j++) {
      if(plan[j].href === req.params.date){
        // send response
        res.send(plan[j]);
      }
    }
    // Send empty JSON
    res.send("")
  }else{
    res.send("Forbidden")
  }
});

server.get('/plan/:date/:klasse', function(req, res, next){
  if(req.headers["x-apikey"] == apiKey){
    var returnedPlan = new Object();
    returnedPlan.items = []
    // Loop over all possible plans
    for(var j = 0; j < plan.length;j++){
      if(plan[j].href === req.params.date){
        // send the date of the plan
        returnedPlan.date = plan[j].date
        // send the Msg of the Day
        returnedPlan.msg = plan[j].msg
        //loop over all items in the requested plan
        for(index in plan[j].items){
          if(plan[j].items[index].klasse.indexOf(req.params.klasse) > -1){
            //check if the query in the url is matching
            returnedPlan.items.push(plan[j].items[index]);
          }
        }
        if(returnedPlan.items.length == 0){
          // Send empty JSON
          // returnedPlan.items.push(emptyData())
        }
        res.send(returnedPlan);
      }
    }

    // returnedPlan.items.push(emptyData())
    res.send(returnedPlan);
  }else{
    res.send("Forbidden")
  }
})

server.get('/plan/:date/:klasse/:letter', function(req, res, next){
  if(req.headers["x-apikey"] == apiKey){
    var returnedPlan = new Object();
    returnedPlan.items = [];
    // Loop over all possible plans
    for(var j = 0; j < plan.length;j++){
      if(plan[j].href === req.params.date){
        // send the date of the plan
        returnedPlan.date = plan[j].date;
        // send the Msg of the Day
        returnedPlan.msg = plan[j].msg
        //loop over all items in the requested plan
        for(index in plan[j].items){
          //check if the query in the url is matching
          if(plan[j].items[index].klasse.indexOf(req.params.klasse) > -1 &&  plan[j].items[index].klasse.indexOf(req.params.letter) > -1){
            returnedPlan.items.push(plan[j].items[index]);
          }
        }
        if(returnedPlan.items.length == 0){
          // Send empty JSON
          // returnedPlan.items.push(emptyData())
        }
        res.send(returnedPlan);
      }
    }

    // returnedPlan.items.push(emptyData());
    res.send(returnedPlan);
  }else{
    res.send("Forbidden")
  }
});

// initiate the loop
loop()

server.listen(port,host, function() {
  console.log(getDateTime() + ': %s listening at %s', server.name, server.url);
});

function getDateTime() {
  var date = new Date();
  var hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + (hour + 6);
  var min  = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;
  var sec  = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;
  var day  = date.getDate();
  day = (day < 10 ? "0" : "") + day;

  return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

function emptyData() {
  // Send empty JSON
  return {
    "klasse":"",
    "stunde":"",
    "vertreter":"",
    "lehrer":"",
    "fach":"",
    "normRaum":"",
    "raum":"",
    "info":""
  }
}
