const gulp = require('gulp');
const webpack = require('webpack-stream');
const uglify = require('gulp-uglify');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const imagemin = require('gulp-imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageResize = require('gulp-image-resize');
const rename = require('gulp-rename');
const clean = require('gulp-clean');
const connect = require('gulp-connect');

const reload = browserSync.reload;

// complie sass files to css
gulp.task('styles', () =>
  gulp
    .src('./app/sass/**/*.scss')
    .pipe(
      sass({
        outputStyle: 'compressed',
      }).on('error', sass.logError),
    )
    .pipe(gulp.dest('./app/css'))
    .pipe(browserSync.stream()),
);

// bundle scripts with webpack
gulp.task('scripts', () =>
  gulp
    .src('./app/scripts/**/*.js')
    .pipe(webpack(require('./webpack.config.js')))
    .pipe(uglify())
    .pipe(gulp.dest('./app/js')),
);

// optimize images
gulp.task('imagemin', () =>
  gulp
    .src('./app/img/**/*.*')
    .pipe(
      imagemin(
        [
          imageminMozjpeg({
            quality: 50,
          }),
        ],
        {
          verbose: true,
        },
      ),
    )
    .pipe(gulp.dest('./app/img')),
);

gulp.task('imageResize', () => {
  const widths = [320, 480, 800];
  let stream;
  widths.forEach((width) => {
    stream = gulp
      .src('./app/images/**/*.*')
      .pipe(imageResize({ width }))
      .pipe(
        rename((path) => {
          path.basename += `-${width}w`;
        }),
      )
      .pipe(gulp.dest('./app/img'));
  });
  return stream;
});

// serve files for development
gulp.task(
  'serve',
  gulp.series(['styles'], () => {
    browserSync.init({
      server: './app',
      port: 3000,
    });

    gulp.watch('./app/sass/**/*.scss', gulp.series(['styles']));
    gulp.watch('./app/**/*.html').on('change', reload);
    gulp.watch('./app/**/*.json').on('change', reload);
    gulp
      .watch(['./app/sw.js', './app/scripts/**/*.js'], gulp.series(['scripts']))
      .on('change', reload);
  }),
);

gulp.task('serve:dist', () =>
  connect.server({
    port: 8080,
    root: 'dist',
  }),
);

// copy files to dist folder
gulp.task('copy-images', () => gulp.src('app/img/*').pipe(gulp.dest('./dist/img')));

gulp.task('copy-css', () => gulp.src('app/css/**/*.css').pipe(gulp.dest('./dist/css')));

gulp.task('copy-js', () => gulp.src('app/js/**/*.js').pipe(gulp.dest('./dist/js')));

gulp.task(
  'copy-files',
  gulp.series([
    'copy-images',
    'copy-js',
    'copy-css',
    () => gulp.src(['app/**/*.html', 'app/**/*.json', 'app/sw.js']).pipe(gulp.dest('./dist')),
  ]),
);

// clean folders
gulp.task('clean', () =>
  gulp.src(['./app/img', './app/css', './app/js'], { read: false, allowEmpty: true }).pipe(clean()),
);

gulp.task('clean:dist', () => gulp.src('./dist', { read: false, allowEmpty: true }).pipe(clean()));

gulp.task(
  'dist',
  gulp.series([
    'clean',
    'clean:dist',
    'imageResize',
    'imagemin',
    'styles',
    'scripts',
    'copy-files',
    'serve:dist',
  ]),
);

gulp.task(
  'default',
  gulp.series(['clean', 'imageResize', 'imagemin', 'styles', 'scripts', 'serve']),
);
