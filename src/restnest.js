var _ = require('lodash');

const http_verbs      = ['HEAD', 'GET', 'PUT', 'POST', 'DELETE'];
const param_locations = ['path', 'body', 'query'];
const mergeable_props = ['method', 'headers', 'body', 'params'];

function _throw(message) { throw new Error(message); }

const restnest = {
    /**
     * Define a new resource
     */
    def({ method = 'GET', path, headers = {}, params = {}, schema = [], resources = {} }) {
        var def = {
            method:    method.toUpperCase(),
            path:      path,
            headers:   headers,
            params:    params,
            resources: {}
        };

        if (!_.contains(http_verbs, method)) {
            _throw(`Invalid method '${ method }'`);
        }

        def.schema = schema.map(param_spec => {
            if (!param_spec.key) {
                _throw(`No key defined for parameter schema ${ JSON.stringify(param_spec) }`);
            }
            if (param_spec.location && !_.contains(param_locations, param_spec.location)) {
                _throw(`Invalid parameter spec location '${ param_spec.location }'`);
            }
            return _.assign({ location: 'query', required: false }, param_spec);
        });

        if (path) {
            var path_params = path.match(/:[a-zA-Z0-9]+/g);
            if (path_params !== null) {
                def.schema = def.schema.concat(path_params.map(path_param => {
                    return { key: path_param.substr(1), required: true, location: 'path' };
                }));
            }
        }

        _.forOwn(resources, (resource, id) => {
            restnest.add(def, id, resource);
        });

        return def;
    },

    /**
     * Collect info for each available resources.
     * @return {Array.<String>}
     */
    info(resource, stack = []) {
        stack.push(`${ resource.method } ${ resource.path || 'N/A' }
  headers: ${ JSON.stringify(resource.headers) }
  params: ${ JSON.stringify(resource.params) }
  schema: ${ JSON.stringify(resource.schema) }`);

        _.forOwn(resource.resources, child_resource => {
            restnest.info(restnest.merge([resource, child_resource]), stack);
        });

        return stack;
    },

    /**
     * Add resource with given id to the given root resource.
     * @param {Object} resource
     * @param {String} id
     * @param {Object} def
     * @return {Object} augmented resource
     */
    add(root, id, def) {
        if (root.resources[id]) {
            _throw(`Resource with id '${ id }' already defined`);
        }
        root.resources[id] = restnest.def(def);

        return root;
    },

    /**
     * Merge multiple resources and return a new one.
     * @param {Array.<Object>} resources
     * @return {Object}
     */
    merge(resources) {
        // merge options for each resources from top to bottom
        var merged = _.merge({}, ..._.map(resources, resource => _.pick(resource, mergeable_props)));

        // append last resource resources
        merged.resources = _.cloneDeep(_.last(resources).resources);

        // construct full path from each resource path
        merged.path = _.reduce(resources, (path, resource) => path + (resource.path ? resource.path : ''), '');

        // merge all schema
        merged.schema = _.reduce(resources, (schema, resource) => schema.concat(resource.schema), []);

        return merged;
    },

    /**
     * Collect each resources from the current tree and return a merged one.
     * @param {Object} root the definition tree
     * @param {String} path the path to the resource, dot separated
     * @param {Object} params params to bind to the resulting resource
     * @param {Array.<Object>} stack collected resources
     */
    with(root, path, params = {}, stack = []) {
        var pathParts = path.split('.');
        if (pathParts.length === 0) {
            _throw('Invalid path given');
        }

        if (stack.length === 0) {
            stack.push(root);
        }

        var headPath = _.first(pathParts);

        if (!root.resources[headPath]) {
            _throw(`No resource defined having id '${ headPath }'`);
        }

        var resource = root.resources[headPath];

        stack.push(resource);

        var restParts = _.rest(pathParts);

        // if there is no tail parts, we're done, we can return the stack
        if (restParts.length === 0) {
            var merged = restnest.merge(stack);
            _.merge(merged.params, params);

            return merged;
        }

        // recursivity
        return restnest.with(resource, _.rest(pathParts).join('.'), params, stack);
    },

    call(resource, adapter, params = {}) {
        var schema = resource.schema;

        resource = _.omit(resource, ['schema', 'resources']);
        _.merge(resource.params, params);

        resource.query_params = {};

        schema.forEach(param_schema => {
            if (param_schema.required === true && !_.has(resource.params, param_schema.key)) {
                _throw(`Parameter '${ param_schema.key }' must be defined`);
            }

            switch (param_schema.location) {
                case 'path':
                    resource.path = resource.path.replace(`:${ param_schema.key }`, params[param_schema.key]);

                    // remove consumed parameter
                    resource.params = _.omit(resource.params, param_schema.key);
                    break;

                case 'query':
                    break;

                case 'body':
                    break;
            }
        });

        console.log(resource);

        return adapter.call(resource);
    }
};

module.exports = restnest;