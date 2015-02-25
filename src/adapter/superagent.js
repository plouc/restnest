var _       = require('lodash');
var request = require('superagent');
require('superagent-bluebird-promise');

module.exports = {
    call({ method, path, headers, body }) {
        var req = request[method.toLowerCase()](path);

        _.forOwn(headers, (value, key) => {
            req.set(key, value);
        });

        return req.promise()
            .then(res => {
                return res.body;
            })
        ;
    }
};