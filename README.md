# RESTNEST

RestNest is a small client targeting json REST APIs consumption.
Be warned that it's a project to play with es6 features, so use it at your own risk :)

## Motivation

Provide a simple way to describe your APIs and consume it.


Example using the github api.

```javascript
var r = require('restnest');
var a = require('restnest/superagent_adapter');

// create the client, declare resources
var api = r.def({
    path: 'https://api.github.com',
    headers: { Accept: 'application/vnd.github.v3+json' },
    resources: {
        users: {
            path: '/users',
            resources: {
                list: {},
                user:  {
                    path: '/:username',
                    resources: {
                        repos:     { path: '/repos'     },
                        gists:     { path: '/gists'     },
                        orgs:      { path: '/orgs'      },
                        followers: { path: '/followers' }
                    }
                }
            }
        }
    }
});

// consume
r.call(r.with(api, 'users.user.repos'), a, {
    username: 'plouc'
})
    .then(function (res) {
    })
    .catch(function (err) {
    })
;

```