var _ = require('lodash');

function _throw(message) { throw new Error(message); }

var restnest = {
    /**
     * Define a new resource
     */
    def({ method = 'GET', path, headers = {}, params = {}, schema = [], resources = {} }) {
        var def = {
            method:    method,
            path:      path,
            headers:   headers,
            params:    params,
            resources: {}
        };

        def.schema = schema.map(paramDef => {
            if (!paramDef.key) {
                _throw(`No key defined for parameter schema ${ JSON.stringify(paramDef) }`);
            }
            return _.assign({ location: 'query', required: false }, paramDef);
        });

        if (path) {
            var pathParams = path.match(/:[a-zA-Z0-9]+/g);
            if (pathParams !== null) {
                def.schema = def.schema.concat(pathParams.map(pathParam => {
                    return { key: pathParam.substr(1), required: true, location: 'path' };
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

        _.forOwn(resource.resources, childResource => {
            restnest.info(restnest.merge([resource, childResource]), stack);
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
        if (root.resources[id]) { _throw(`resource with id "${ id }" already defined`); }
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
        var merged = _.merge({}, ..._.map(resources, resource => _.pick(resource, ['method', 'headers', 'body', 'params'])));

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
     * @param {Array.<Object>} stack collected resources
     */
    with(root, path, stack = []) {
        var pathParts = path.split('.');
        if (pathParts.length === 0) {
            _throw('Invalid path given');
        }

        if (stack.length === 0) {
            stack.push(root);
        }

        var headPath = _.first(pathParts);

        if (!root.resources[headPath]) {
            _throw(`no resource defined for id "${ headPath }"`);
        }

        var resource = root.resources[headPath];

        stack.push(resource);

        var restParts = _.rest(pathParts);

        // if there is no tail parts, we're done, we can return the stack
        if (restParts.length === 0) {
            return restnest.merge(stack);
        }

        // recursivity
        return restnest.with(resource, _.rest(pathParts).join('.'), stack);
    },

    call(resource, adapter, params = {}) {
        var schema = resource.schema;

        resource = _.omit(resource, ['schema', 'resources']);
        _.merge(resource.params, params);

        schema.forEach(paramSchema => {
            if (paramSchema.required === true && !_.has(resource.params, paramSchema.key)) {
                _throw(`Parameter '${ paramSchema.key }' must be defined`);
            }


        });

        console.log(resource);
    }
};

module.exports = restnest;