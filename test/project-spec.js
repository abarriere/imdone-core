var should       = require('should'), 
    _            = require('lodash'),
    expect       = require('expect.js'),
    Repository   = require('../lib/repository'),
    repoStore    = require('../lib/mixins/repo-fs-store'),
    Project      = require('../lib/project'),
    projectStore = require('../lib/mixins/project-fs-store'),
    wrench       = require('wrench'),
    log          = require('debug')('imdone-core:project-spec'),
    path         = require('path'),
    stringify    = require('json-stringify-safe'),
    async        = require('async');

describe.skip("Project", function() {
  var tmpDir      = path.join(process.cwd(), "tmp"),
      tmpReposDir = path.join(tmpDir, "repos"),
      tmpCfgDir   = path.join(tmpDir, "user-home"),
      repoSrc  = path.join(process.cwd(), "test", "repos"),
      repo1Dir = path.join(tmpReposDir, "repo1"),
      repo2Dir = path.join(tmpReposDir, "repo2"),
      repo1,
      repo2;

  process.env.IMDONE_CONFIG_DIR = tmpCfgDir;
  
  beforeEach(function() {
    wrench.mkdirSyncRecursive(tmpDir);
    wrench.mkdirSyncRecursive(path.join(tmpCfgDir,".imdone"));
    wrench.copyDirSyncRecursive(repoSrc, tmpReposDir, {forceDelete: true});
    repo1 = repoStore(new Repository(repo1Dir));
    repo2 = repoStore(new Repository(repo2Dir));
  });

  afterEach(function() {
    repo1.destroy();
    repo2.destroy();
    wrench.rmdirSyncRecursive(tmpDir, true);
  });

  describe("getTasks", function() {
    it("should return an array of lists with sorted tasks", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]));
      project.init(function(err, result) {
        var lists = project.getTasks();
        (lists.length).should.be.exactly(3);
        var DONE = _.find(lists, {name:"DONE"});
        (DONE.tasks.length).should.be.exactly(1);
        var TODO = _.find(lists, {name:"TODO"});
        (TODO.tasks.length).should.be.exactly(6);
        var DOING = _.find(lists, {name:"DOING"});
        (DOING.tasks.length).should.be.exactly(6);
        done();
      });
    });

    it("should return an array of lists with sorted tasks for the repo provided", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]));
      project.init(function(err, result) {
        var lists = project.getTasks(repo1.getId());
        log(lists);
        (lists.length).should.be.exactly(3);
        var TODO = _.find(lists, {name:"TODO"});
        (TODO.tasks.length).should.be.exactly(3);
        var DOING = _.find(lists, {name:"DOING"});
        (DOING.tasks.length).should.be.exactly(3);
        done();
      });
    });
  });

  describe("getLists", function() {
    it("should return the lists from a single repository", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1,repo2]));
      project.init(function(err, result) {
        var lists = project.getLists(repo1.getId());
        (lists.length).should.be.exactly(3);
        done();
      });
    });

    it("should return the lists from all repositories", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]));
      project.init(function(err, result) {
        var lists = project.getLists();
        (lists.length).should.be.exactly(3);
        done();
      });
    });
  });

  describe("moveList", function() {
    it("should move a list by name in all repos and in project", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]));
      project.init(function(err, result) {
        project.moveList("TODO", 0, function() {
          var lists = project.getLists();
          (_.findIndex(lists, {name:"TODO"})).should.be.exactly(0);
          done();
        });
      });
    });
  });

  describe("renameList", function() {
    it("Should modify the name of a list for all repos in the project", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]));
      project.init(function(err, result) {
        var tasksExpected = project.getTasksInList("TODO").length; 
        log('tasksExpected:%d', tasksExpected);
        project.renameList("TODO", "PLANNING", function() {
          (project.getTasksInList("PLANNING").length).should.be.exactly(tasksExpected);
          (project.getTasksInList("TODO").length).should.be.exactly(0);
          done();
        });
      });
    });
  });

  describe("moveTasks", function(done) {
    it("Should move a task to the requested location in the requested list", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]));
      project.init(function(err, result) {
        var todo = project.getTasksInList("TODO");
        var taskToMove = todo[1];
        //console.log(JSON.stringify(taskToMove, null, 3));
        project.moveTasks([taskToMove], "DOING", 1, function() {
          var doing = project.getTasksInList("DOING");
          console.log(JSON.stringify(doing,null, 3));
          (taskToMove.equals(doing[1])).should.be.true;
          console.log("DONE");
          done();
        });
      });
    });

    it("Should move a task to the requested location in the same list", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]));
      project.init(function(err, result) {
        var todo = project.getTasksInList("TODO");
        var taskToMove = todo[1];
        project.moveTasks([taskToMove], "TODO", 2, function() {
          (taskToMove.equals(project.getTasksInList("TODO")[2])).should.be.true;
          done();
        });
      });
    });  

    it("Should move multiple tasks to the requested location in the requested list", function(done) {
      var project = projectStore(new Project("Jesse", "My Project", [repo1, repo2]));
      project.init(function(err, result) {
        var todo = project.getTasksInList("TODO");
        var tasksToMove = [todo[0], todo[2]];
        project.moveTasks(tasksToMove, "DOING", 1, function() {
          (project.getTasksInList("TODO").length).should.be.exactly(todo.length-2);
          (tasksToMove[0].equals(project.getTasksInList("DOING")[1])).should.be.true;
          (tasksToMove[1].equals(project.getTasksInList("DOING")[2])).should.be.true;
          done();
        });

      });
    });  
  });

});