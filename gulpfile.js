"use strict";

//	npm install 'coffee-script' -> this is used for test
require('coffee-script/register');

var path = require('path');
var mkdirp = require('mkdirp');
var del	= require('del');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gulp = require('gulp');
var coffee = require('gulp-coffee');
var coffeelint = require('gulp-coffeelint');
var sourcemaps = require('gulp-sourcemaps');
var changed = require('gulp-changed');
var concat = require('gulp-concat');
var handlebars = require('gulp-handlebars');
var jshint = require('gulp-jshint');
var browserify = require('browserify');
var sass = require('gulp-sass');
var wrap = require('gulp-wrap');
var uglify = require('gulp-uglify');
var minifyHTML = require('gulp-minify-html');

var env = require('./env');

del.sync(env.BUILD_DIR);

gulp.task('scaffold', function() {
	[
		'SOURCE_VIEWS_DIR',
		'SOURCE_TEMPLATES_DIR',
		'SOURCE_PARTIALS_DIR',
		'SOURCE_SCRIPTS_DIR',
		'SOURCE_STYLES_DIR',
		'VIEWS_DIR',
		'TEMPLATES_DIR',
		'PARTIALS_DIR',
		'SCRIPTS_DIR',
		'STYLES_DIR'
	].forEach(function(key) {
		mkdirp.sync(env[key]);
	})
});

//  Lint js files
//
gulp.task('lint-js', ['scaffold'], function() {
	return gulp.src(path.join(env.SOURCE_SCRIPTS_DIR, '**/*.js'))
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

//	Move js files
//
gulp.task('js', ['lint-js'], function() {
  	return gulp.src(path.join(env.SOURCE_SCRIPTS_DIR, '**/*.js'))
  		.pipe(changed(env.SCRIPTS_DIR))
    	.pipe(gulp.dest(env.SCRIPTS_DIR))
});

//  Lint coffeescript files
//
gulp.task('lint-coffee', ['scaffold'], function() {
	return gulp.src(path.join(env.SOURCE_SCRIPTS_DIR, '**/*.coffee'))
		.pipe(coffeelint('./coffeelint.json'))
		.pipe(coffeelint.reporter('default'))
});

//	Convert .coffee files to .js files and move them
//
gulp.task('coffee', ['lint-coffee'], function() {
  	return gulp.src(path.join(env.SOURCE_SCRIPTS_DIR, '**/*.coffee'))
  		.pipe(changed(env.SCRIPTS_DIR, {
  			extension: '.js'
  		}))
  		.pipe(sourcemaps.init())
    	.pipe(coffee({bare: true}))
    	.pipe(sourcemaps.write())
    	.pipe(gulp.dest(env.SCRIPTS_DIR))
});

//	Convert .scss files to .css files and move them
//
gulp.task('styles', function() {
    return gulp.src(path.join(env.SOURCE_STYLES_DIR, '**/*.scss'))
  		.pipe(changed(env.SCRIPTS_DIR, {
  			extension: '.css'
  		}))
        .pipe(sass())
        .pipe(concat('app.css'))
        .pipe(gulp.dest(env.STYLES_DIR));
});

gulp.task('templates', function () {  
	return gulp.src(path.join(env.SOURCE_TEMPLATES_DIR, '/**/*.hbs'))
		.pipe(handlebars())
		.pipe(wrap('var Handlebars = require("handlebars/runtime")["default"];module.exports = Handlebars.template(<%= contents %>);'))
		.pipe(gulp.dest(env.TEMPLATES_DIR));
});

gulp.task('partials', function () {  
	return gulp.src(path.join(env.SOURCE_PARTIALS_DIR, '/**/*.html'))
		.pipe(gulp.dest(env.PARTIALS_DIR));
});

// Fetch our main app code and browserify it
// This bundle will be loaded by views, such as index.html
//
gulp.task('browserify', ['coffee', 'templates', 'views'], function() {
	return browserify('./' + env.SCRIPTS_DIR + '/app.js')
		.bundle()
		// Converts browserify out to streaming vinyl file object 
		//
		.pipe(source('app.js')) 
		// uglify needs conversion from streaming to buffered vinyl file object
		//
		.pipe(buffer()) 
		.pipe(uglify()) 
		.pipe(gulp.dest(env.SCRIPTS_DIR));
});

//	All .html files in source folder
//
gulp.task('views', ['scaffold'], function() {
	return gulp.src(path.join(env.SOURCE_VIEWS_DIR, '*.html'))
		.pipe(minifyHTML({
			empty: true
		}))
		.pipe(gulp.dest(env.VIEWS_DIR))
});

gulp.task('default', [
	'scaffold', 
	'lint-coffee',
	'coffee',
	'lint-js',
	'js',
	'styles',
	'templates',
	'partials',
	'browserify',
	'views'
]);