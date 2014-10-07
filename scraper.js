// domain name
// registrant name
// registrant phone
// registrant email

var

  /** asynchronous flow library */
  $q = require('q'),

  /** request agent module */
  request = require('superagent'),

  /** line reader helper module */
  lineReader = require('line-reader'),

  /** file system  module */
  fs = require('fs'),

  /** base url */
  baseUrl = 'https://www.whoisxmlapi.com/whoisserver/WhoisService?outputFormat=json&domainName=',

  /** promises to be resolved */
  promises = [];

  /** urls to be pinged */
  urls = [],

  /** urls in which errors occurred */
  badUrls = [],

  /** final output */
  output = [];

$q.fcall(function() {
  var deferred = $q.defer();
  var _promises = [];

  // find all files in `in` directory
  fs.readdir('./in', function(err, files) {

    // loop through all files
    for (var i = 0, len = files.length; i < len; i++) {
      _promises.push((function(file) {
        var _deferred = $q.defer();

        // read each line in file
        lineReader.eachLine('./in/' + file, function(line, last) {
          // trim line
          var trimmed = (line || '').toString().trim();

          // if not white space, add to queue
          if (trimmed.length) {
            urls.push(trimmed);
          }

        }).then(function() {
          console.log('Finished reading file: ' + file);
          _deferred.resolve(true);
        });

        return _deferred.promise;
      })(files[i]));
    }


    $q.all(_promises).then(function() {
      // all files read, move on to next step
      deferred.resolve(true);
    });
  });

  return deferred.promise;
}).then(function() {
  console.log('Prepared urls: ' + urls.join(','));

  // loop through urls
  for (var i = 0, len = urls.length; i < len; i++) {
    // call anonymous function
    promises.push((function(url) {
      var deferred = $q.defer();

      request
        .get(baseUrl + url)
        .end(function(err, res) {
          if (err) {
            console.log('Dang, an error occurred (' + test + '): ' + err.toString());
            badUrls.push(url);
            deferred.reject(null);
            return;
          }

          try {
            var data = JSON.parse(res.text);
            var WhoIsRecord = data.WhoisRecord;
            var registrant = WhoIsRecord.registrant;

            registrant._url = url;
            deferred.resolve(registrant)

          } catch (e) {
            console.log('Error parsing JSON (' + url + '): ' + e.toString());
            badUrls.push(url);
            deferred.reject(null);
          }
        });

      return deferred.promise;
    })(urls[i]));
  }

  $q.all(promises).then(function(data) {
    console.log("All promises resolved.");
    var formattedData;

    for (var i = 0, len = data.length; i < len; i++) {
      if (data[i] == null) {
        continue;
      }

      formattedData = data[i]._url + ',' + (data[i].name || '') + ',' + (data[i].telephone || '') + ',' + (data[i].email || '');
      output.push(formattedData);
    }

    console.log('Formatted all data: ' + output.join("\n"));
    var path = './out/' + Date.now() + '.csv';
    fs.writeFile(path, output.join("\n"), function(err) {
      if (err) {
        console.log("Error writing file: " + err.toString());
      }

      console.log("Saved file: " + path);
    });
  });
});