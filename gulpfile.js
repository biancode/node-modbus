/**

 The MIT License (MIT)
 Copyright (c) 2016 Klaus Landsdorf http://bianco-royal.de/

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
 OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 @author <a href="mailto:klaus.landsdorf@bianco-royal.de">Klaus Landsdorf</a> (Bianco Royal)

 **/

'use strict'

let gulp = require('gulp')
let clean = require('gulp-clean')
let jsdoc = require('gulp-jsdoc3')

gulp.task('default', function () {
  // place code for your default task here
})

gulp.task('docs', ['doc', 'docIcons', 'docExamples'])
gulp.task('build', ['nodejs'])
gulp.task('publish', ['build', 'icons', 'vendor', 'docs'])

gulp.task('clean', function () {
  return gulp.src('node-modbus')
    .pipe(clean({force: true}))
})

gulp.task('doc', function (cb) {
  gulp.src(['README.md', 'src/**/*.js'], {read: false})
    .pipe(jsdoc(cb))
})

gulp.task('docIcons', function () {
  return gulp.src('src/icons/**/*').pipe(gulp.dest('docs/icons'))
})

gulp.task('docExamples', function () {
  return gulp.src('examples/**/*').pipe(gulp.dest('docs/examples'))
})

gulp.task('icons', function () {
  return gulp.src('src/icons/**/*').pipe(gulp.dest('node-modbus/icons'))
})

gulp.task('vendor', function () {
  return gulp.src('src/public/**/*').pipe(gulp.dest('node-modbus/public'))
})

gulp.task('nodejs', function () {
  return gulp.src('src/**/*.js')
    .pipe(gulp.dest('node-modbus'))
})
