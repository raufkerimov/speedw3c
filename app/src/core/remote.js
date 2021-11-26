const {get} = require("axios");

module.exports = function (url, apikey, callback) {
    get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + url + '&key=' + apikey + '&strategy=mobile')
        .then(function (response) {
            callback(response.data);
        })
        .catch(function (error) {
            console.log(error);
        });
}