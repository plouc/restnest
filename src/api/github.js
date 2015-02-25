var r = require('../restnest');

var api = r.def({
    path: 'https://api.github.com',
    headers: {
        Accept: 'application/vnd.github.v3+json'
    },
    schema: [
        { key: 'page',     location: 'query' },
        { key: 'per_page', location: 'query' }
    ]
});

r.add(api, 'events', { path: '/events' });

r.add(api, 'repos', {
    path: '/repos',
    resources: {
        owner: {
            path: '/:owner',
            resources: {
                repo: {
                    path: '/:repo',
                    resources: {
                        events: { path: '/events' }
                    }
                }
            }
        }
    }
});

r.add(api, 'users', {
    path: '/users',
    resources: {
        user: {
            path: '/:username',
            resources: {
                received_events: {
                    path: '/received_events',
                    resources: {
                        public: { path: '/public' }
                    }
                }
            }
        }
    }
});

module.exports = api;