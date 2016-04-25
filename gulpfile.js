var gulp = require('gulp');
var del = require('del');
var ts = require('gulp-typescript');

gulp.task('clean:js', function () {
    return del([
        'src/*.js',
        'src/*.map',
        'test/*.js',
        'test/*.map'
    ]);
});

gulp.task('dist', function () {
    
    var tsResult = gulp.src('src/highlighter.ts')
        .pipe(ts({
            outFile: 'highlighter.js',
            target: "es5"
        }));
        tsResult.pipe(gulp.dest('dist'));
});

gulp.task('default', ['clean:js', 'dist']);
