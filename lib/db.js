var _ = require('lodash');
var path = require('path');
var moment = require('moment');
var sprintf = require('sprintf-js').sprintf;

module.exports = function(shipit) {
  // Ask Karl
  // init();
  //
  var init = function init() {
    shipit.currentPath = path.join(shipit.config.deployTo, 'current');
    shipit.sharedPath = path.join(shipit.config.deployTo, 'shared');
    shipit.config.db = getConfig();
    return shipit;
  };

  var getConfig = function getConfig() {
    return _.defaults(shipit.config.db, {
      dumpDir: 'db',
      cleanLocal: true,
      cleanRemote: true,
    });
  };

  var dumpFile = function dumpFile(environment) {
    return path.join(
      shipit.config.db.dumpDir,
      sprintf('%(database)s-%(currentTime)s.sql.bz2', {
        database: shipit.config.db[environment].database,
        currentTime: moment.utc().format('YYYYMMDDHHmmss'),
      })
    );
  };

  var credentialParams = function credentialParams(dbConfig) {
    var params = {
      '-u': dbConfig.username || null,
      '-p': dbConfig.password || null,
      '-h': dbConfig.host || null,
      '-S': dbConfig.socket || null,
      '-P': dbConfig.port || null,
    };

    var paramStr = Object.keys(params).map(function(key) {
      return (params[key]) ? key + "'" + params[key] + "'" : false;
    }).filter(function(elem) {
      return !!elem;
    });
    return paramStr.join(' ');
  };

  var dumpCmd = function dumpCmd(environment) {
    return sprintf('mysqldump %(credentials)s %(database)s --lock-tables=false', {
      credentials: credentialParams(shipit.config.db[environment]),
      database: shipit.config.db[environment].database,
    });
  };

  var importCmd = function importCmd(file, environment) {
    return sprintf('mysql %(credentials)s -D %(database)s < %(file)s', {
      credentials: credentialParams(shipit.config.db[environment]),
      database: shipit.config.db[environment].database,
      file: path.basename(file, '.bz2'),
    });
  };

  var dump = function dump(environment, file) {
    // var dumpDir = (environment == 'remote') ? shipit.currentPath : shipit.sharedPath;
    return shipit[environment](
      sprintf('%(dumpCmd)s | bzip2 - - > %(dumpFile)s', {
        dumpCmd: dumpCmd(environment),
        dumpFile: file,
      })
    );
  };

  var load = function load(file, environment) {
    return shipit[environment](sprintf('bunzip2 -f %(file)s && %(importCmd)s', {
      file: file,
      importCmd: importCmd(file, environment)
    }));
  };

  var clean = function clean(path, environment, enabled) {
    if (enabled) {
      return shipit[environment]('rm -f ' + path);
    }
  };

  return {
    init: init,
    dump: dump,
    load: load,
    clean: clean,
    dumpFile: dumpFile,
  };
};