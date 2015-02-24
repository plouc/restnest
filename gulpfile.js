var gulp  = require('gulp');
var del   = require('del');
var babel = require('gulp-babel');

gulp.task('lib-clean', function (done) {
    del('./lib', done);
});

gulp.task('lib-compile', ['lib-clean'], function () {
    return gulp.src([
            './src/**/*.js',
            '!./src/__tests__/**'
        ])
        .pipe(babel())
        .pipe(gulp.dest('./lib'))
    ;
});

gulp.task('lib', ['lib-clean', 'lib-compile']);