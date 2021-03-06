var should  = require('should');
var fs      = require('fs');
var helpers = require('../helpers');
var Task    = require('./../../');

describe('up', function (done) {
  var task;
  var conn;

  //ensure the migration folder is cleared before each test
  beforeEach(function(done){
    helpers.cleanupDir('migrations', done);
  });

  beforeEach(function (done) {
    helpers.connect(function (err, driver) {
      if (err) return done(err);

      conn = driver;
      task = new Task(conn, { dir: 'migrations' });

      done();
    });
  });

  describe('create the orm_migrations table', function(done){
    afterEach(function (done) {
      helpers.cleanupDbAndDir(conn, task.dir, ['table1', 'table2'], done);
    });

    it('creates the orm_migrations table', function(done){
      fs.writeFile(task.dir + '/001-create-table1.js', table1Migration, function(err, result){
        task.up(
          function(err, result){
            should.not.exist(err);

            conn.execQuery('SELECT count(*) FROM ??', ['orm_migrations'], function(err, result){
              should.not.exist(err);
              done();
            });
          });
      });
    });

    describe('#up migrating', function(done){
      afterEach(function(done){
        helpers.cleanupDbAndDir(conn, task.dir,['table1'], done);
      });

      beforeEach(function(done){
        task.mkdir(function(err, result){
          fs.writeFile(task.dir + '/001-create-table1.js', table1Migration, done);
        });
      });

      it('runs a no arg up migrations successfully', function(done){
        task.mkdir(function(err, result){
          task.up(function(err, result){
            conn.execQuery('SELECT count(*) FROM ??', ['orm_migrations'], function(err, result){

              should.equal(result[0]['count'] || result[0]['count(*)'], 1);
              done();
            });
          })
        })
      });

      it('runs a specific up migration successfully', function(done){
        task.mkdir(function(err, result){
          task.up('001-create-table1.js', function(err, result){
            conn.execQuery('SELECT count(*) FROM ??', ['orm_migrations'], function(err, result){
              should.equal(result[0]['count'] || result[0]['count(*)'], 1);
              done();
            });
          })
        })
      });

      it('runs two migrations successfully', function(done){
        fs.writeFile(task.dir + '/002-add-two-columns.js', column2Migration, function(err, result){
          task.up(function(err, result){

            conn.execQuery(
              'SELECT column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = ? AND column_name LIKE ?',
              ['table1', 'wobble'],
              function (err, result) {
                if (err) return done(err);

                should.equal(result[0].column_name, 'wobble');

                conn.execQuery(
                  'SELECT column_name FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = ? AND column_name LIKE ?',
                  ['table1', 'wibble'],
                  function (err, result) {
                    should.equal(result[0].column_name, 'wibble');
                    done();
                  }
                );
              }
            );
          });
        });
      });
    });
  });
});

var table1Migration = "exports.up = function (next) {         \n\
this.createTable('table1', {                                  \n\
  id     : { type : \"number\", primary: true, serial: true },\n\
  name   : { type : \"text\", required: true }                \n\
}, next);                                                     \n\
};                                                            \n\
                                                              \n\
exports.down = function (next){                               \n\
  this.dropTable('table1', next);                             \n\
};";

var column2Migration = "exports.up = function (next) {         \n\
  var that = this;                                             \n\
  this.addColumn('table1', {                                   \n\
    wobble   : { type : \"text\", required: true }             \n\
  }, function(err) {                                           \n\
    if(err) { return next(err); }                              \n\
    that.addColumn('table1', {                                 \n\
      wibble   : { type : \"text\", required: true }           \n\
    }, next);                                                  \n\
  });                                                          \n\
};                                                             \n\
exports.down = function(next){                                 \n\
  var that = this;                                             \n\
  this.dropColumn('table1', 'wibble', function(err){           \n\
    if(err) { return next(err); }                              \n\
    that.dropColumn('table1', 'wobble', next);                 \n\
  });                                                          \n\
};";

