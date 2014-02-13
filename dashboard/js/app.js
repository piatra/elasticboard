(function() {
  'use strict';

  window.App = {
    API_HOST:'http://' + window.location.hostname + ':5000/',
    API_BASE: '',
    REPO: '',
  };

  App.initApp = function() {
    var hash = location.hash.split('/');
    if (hash.length > 1) { // checks if any repo is selected
      App.REPO = hash[1] + '/' + hash[2];
      App.API_BASE = App.API_HOST + hash[1] + '/' + hash[2];
    }
    if (App.REPO) {
      initDashboard();
    } else {
      getDefaultRepo(initDashboard);
    }

    // Listeners
    window.onresize = fitTabContainer;
  };

  /*
   * Bundle together different functions
   * used to load the widgets in the application
   */
  function initDashboard () {
    fitTabContainer();
    populateOpenIssues();
    populateOpenPulls();
    populateTimeline();
    $('#user-repo').text(App.REPO);
    changeTabs();
  }

  /*
   * According to URL path
   * navigate to different tabs in the application
   */
  function changeTabs() {

    var href = location.href.split('/');
    if (href.length > 6) {
      var tab = href.pop();
      var tabs = $('ul.menu li');
      tabs.each(function (idx, el) {
        var text = $(el).text().toLowerCase();
        if (text == tab) {
          $(el).trigger('click');
        }
      });
    }

  }

  function loadKibana() {
    $('#kibana-iframe').attr('src', 'kibana-latest/index.html');
  }

  function fitTabContainer () {
    var $container = $('#tab-container');
    $container.height($(window).height() - $container.offset().top - 20);
  }

  $('#repo-select-trigger').on('click', function (e) {
    e.stopPropagation();

    var $container = $('.repo-select');
    var $repoList = $('ul', $container);

    $container.toggleClass('hidden');

    if (!$container.hasClass('hidden')) {
      getAvailableRepos(addRepos);
      $(window).on('click', function () {
        $('.show--fade-in').removeClass('show--fade-in');
        setTimeout(function () {
          $repoList.empty();
        }, 200);
        $(window).off('click');
        $container.toggleClass('hidden');
      });
    } else {
      $('.show--fade-in').removeClass('show--fade-in');
      setTimeout(function () {
        $repoList.empty();
      }, 200);
    }
  });

  function getAvailableRepos (cb) {
    $.get(App.API_HOST + 'available_repos')
    .success(cb)
    .fail(logFailure);
  }

  function addRepos (data) {
    var $container = $('.repo-select');

    var $repoList = $('ul', $container);
    data.data.forEach(function (repo) {
      var repoLink = document.createElement('a');
      var repoLI = document.createElement('li');
      repoLink.href = location.origin + '/#/' + repo;
      repoLink.textContent = repo;
      repoLink.target = '_blank';
      repoLI.appendChild(repoLink);
      repoLI = $(repoLI);
      repoLI.on('click', function (e) {
        e.preventDefault();
        loadDashboard(repoLink.href);
      });
      $repoList.append(repoLI);
    });

    $repoList.toggleClass('show--fade-in');
  }

  function getDefaultRepo(cb) {
    getAvailableRepos(function (data) {
      setLocation(location.origin + '/#/' + data.data[0]); // load first repo
      var hash = data.data[0].split('/');
      App.REPO = hash[0] + '/' + hash[1];
      App.API_BASE = App.API_HOST + hash[0] + '/' + hash[1];
      cb();
    });
  }

  function setLocation (newlocation) {
    location.href = newlocation;
  }

  function loadDashboard (newlocation) {
    setLocation(newlocation);
    location.reload();
  }

  function populateOpenIssues() {
    $.get(App.API_BASE + "/issues_count").success(function (data) {
      var count = data.data.open;
      $('#open-issues-count').text(count);

      if (count) {
        $('#open-issues').click(function () {
          setLocation('http://github.com/' + REPO + '/issues?state=open');
        }).addClass('clickable');
      }
    }).fail(logFailure);
  }

  function populateOpenPulls() {
    $.get(App.API_BASE + "/pulls_count").success(function (data) {
      var count = data.data.open;
      $('#open-pulls-count').text(count);

      if (count) {
        $('#open-pulls').click(function () {
          setLocation('http://github.com/' + REPO + '/pulls?state=open');
        }).addClass('clickable');
      }

    }).fail(logFailure);
  }

  function logFailure(fail) {
    console.log("Trouble getting data. API server down?");
    console.log(fail);
  }


  App.initApp();

})();
