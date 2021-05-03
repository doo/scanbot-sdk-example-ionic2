
function cordova_exec(actionName, module) {
  var func = function(successCallback, errorCallback, options) {
    console.log("ScanbotExampleUi - Calling cordova.exec now");
    cordova.exec(successCallback, errorCallback, module, actionName, (options ? [options] : []));
  };

  func.__is_cordova_wrapper__ = true;

  return func;
}
  
function makeCaller(actionName) {
    return cordova_exec(actionName, "ScanbotExampleUi");
}

var API = {
    startMultipleImagePicker: makeCaller("startMultipleImagePicker")
};

(function() {
  if (typeof Promise === "function") {
    function promisify(func) {
      return function(options) {
        return new Promise(function (resolve, reject) {
          func(resolve, reject, options);
        });
      }
    }

    function promisifyObject(obj) {
      var wrapper = {};
      for (var propName in obj) {
        var prop = obj[propName];
        if (typeof prop === "function") {
          wrapper[propName] = promisify(prop);
        }
      }
      return wrapper;
    }

    var promises = null;
    API.promisify = function() {
      if (!promises) {
        promises = promisifyObject(API);
      }
      return promises;
    }
  }
})();

module.exports = API;