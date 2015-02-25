var should = require('should');
var r      = require('../lib/restnest');

var default_resource = {
    headers:   {},
    method:    'GET',
    params:    {},
    path:      undefined,
    resources: {},
    schema:    []
};

var def;

describe('restnest', function () {

    describe('.def()', function () {
        it('should fill default resource settings', function () {
            def = r.def({});
            def.should.eql(default_resource);
        });

        it('should throw when invalid method provided', function () {
            (function () {
                r.def({ method: 'INVALID' });
            }).should.throw('Invalid method \'INVALID\'');
        });

        it('should automatically populate schema with path parameters when path contains some', function () {
            def = r.def({
                path: '/:username'
            });

            def.schema.should.eql([
                {
                    key:      'username',
                    location: 'path',
                    required:  true
                }
            ]);
        });

        it('should iterate over child resources and process them when provided', function () {
            def = r.def({
                resources: {
                    users:    {},
                    products: {}
                }
            });

            def.resources.should.have.property('users');
            def.resources.users.should.eql(default_resource);

            def.resources.should.have.property('products');
            def.resources.users.should.eql(default_resource);
        });

        it('should throw if a schema contains a params with no key defined', function () {
            (function () {
                r.def({ schema: [{}] });
            }).should.throw('No key defined for parameter schema {}');
        });

        it('should throw when invalid parameter spec location provided', function () {
            (function () {
                r.def({ schema: [{ key: 'test', location: 'invalid' }] });
            }).should.throw('Invalid parameter spec location \'invalid\'');
        });
    });

    describe('.add()', function () {
        it('should append a child resource and fill its default settings', function () {
            def = r.def({});
            r.add(def, 'users', {});

            def.resources.should.have.property('users');
            def.resources.users.should.eql(default_resource);
        });

        it('should throw when a resource with the same id already exists', function () {
            def = r.def({ resources: { users: {} } });

            (function () {
                r.add(def, 'users', {});
            }).should.throw('Resource with id \'users\' already defined');
        });
    });

    describe('.merge()', function () {
        var merged;
        var test_defs = [
            r.def({ path: '/api', schema: [{ key: 'def_0_test_param' }] }),
            r.def({ path: '/users' }),
            r.def({ path: '/:username', resources: { repos: { path: '/repos' } } })
        ];


        it('should merge multiple resources and return the result', function () {
            merged = r.merge(test_defs);
            merged.should.not.be.an.Array;
            merged.should.be.an.Object;
        });

        it('should build a single path from given resources', function () {
            merged = r.merge(test_defs);

            merged.should.have.property('path');
            merged.path.should.eql('/api/users/:username');
        });

        it('should merge all resources schemas', function () {
            merged = r.merge(test_defs);

            merged.should.have.property('schema');
            merged.schema.should.be.an.Array;
            merged.schema.should.eql([
                { key: 'def_0_test_param', location: 'query', required: false },
                { key: 'username',         location: 'path',  required: true  }
            ]);
        });

        it('should preserve last resource resources', function () {
            merged = r.merge(test_defs);

            merged.should.have.property('resources');
            merged.resources.should.have.property('repos');
            merged.resources.repos.should.have.property('path');
            merged.resources.repos.path.should.eql('/repos');
        });
    });

    describe('.with()', function () {
        var with_def;
        var test_def = r.def({
            path: '/this',
            resources: {
                is: {
                    path: '/is',
                    params: { test_param: 'test_param' },
                    resources: { a: { path: '/a', resources: { test: { path: '/test' } } } }
                }
            }
        });

        it('should merged resources for the given path', function () {
            def = r.def(test_def);

            with_def = r.with(def, 'is.a.test');
            with_def.should.be.an.Object;
            with_def.should.have.property('path');
            with_def.path.should.eql('/this/is/a/test');
        });

        it('should bind given params to resulting resource', function () {
            def = r.def(test_def);

            with_def = r.with(def, 'is.a.test');
            with_def.should.have.property('params');
            with_def.params.should.have.property('test_param');
            with_def.params.test_param.should.eql('test_param');

            with_def = r.with(def, 'is.a.test', { test_param: 'test_param_override' });
            with_def.should.have.property('params');
            with_def.params.should.have.property('test_param');
            with_def.params.test_param.should.eql('test_param_override');
        });

        it('should throw if we provide an empty path', function () {
            (function () {
                r.with(r.def(test_def), '');
            }).should.throw('No resource defined having id \'\'');
        });

        it('should throw if we provide an invalid path', function () {
            (function () {
                r.with(r.def(test_def), 'is.a.crap');
            }).should.throw('No resource defined having id \'crap\'');
        });
    });

    describe('.call()', function () {
        it('should throw if we do not provide a required parameter', function () {
            (function () {
                r.call(r.def({ path: '/:username' }));
            }).should.throw('Parameter \'username\' must be defined');
        });
    });
});