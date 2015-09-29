var fs = require('fs'),
    xml2js = require('xml2js'),
    Rx = require('rx'),
    atob = require('atob'),
    fileManager = require('easy-file'),
    readlineSync = require('readline-sync');
   
function CodeBoxFiles(filePath){
  return Rx.Observable.create(function(observer){
    var parser = new xml2js.Parser();
    fs.readFile(filePath, function(err, data) {
      if (err){
        console.log(err);
        observer.onError('Invalid Path: '+filePath)
        return;
      }
      parser.parseString(data, function (err, result) {
        var fileNames = result.database.object.filter(function(obj){
          return obj.$.type == 'SNIPPET';
        }).map(function(obj){
          return {
            // the ugly dot notation is from parser
            name: obj.attribute[0]._,
            id: obj.relationship[1].$.idrefs
          }
        });

        var files = result.database.object.filter(function(obj){
          return obj.$.type == 'ASSET';
        }).map(function(snippet){
          return fileNames.filter(function(file){
            return file.id == snippet.$.id;
          }).map(function(fileData){
            var body = snippet.attribute[0]._;
            if (body == -1){
              if (snippet.attribute[2]){
                body = snippet.attribute[2]._;
              } else{
                console.log('Error: Empty Snippet '+fileData.name);
              }
            }
            try{
              body = atob(body)
            } catch(e){
              console.log('Decode Error '+fileData.name);
            }
            return {
              name: fileData.name,
              body: body
            }
          })
        })
        // its a two dimensional array
        .reduce(function(a, b){
          return a.concat(b);
        })

        files.forEach(function(file){
          observer.onNext(file)
        })
        observer.onCompleted();
      });
    });
  });
} 

var filePath = readlineSync.question('What is the path to "CodeBox.cbxml"?: ');
CodeBoxFiles(filePath).forEach(function(file){
  fileManager.write('CodeBoxSnippets/'+file.name+'.txt', file.body);
}, function(err){
  console.log('Error: ', err);
});