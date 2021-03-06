(function(){

    'use strict';

    window.App = window.App || {};
    App.BASE = App.HOST = (function() {
        var origin = location.origin;
        // remove the trailer port number if running on local
        if (origin.match(/[0-9]{4,4}/)) {
            origin = origin.split(':');
            origin.pop();
            origin = origin.join(':') + ':5000';
        } else {
            origin += ':5000';
        }
        return origin;
    })();
    App.Components = {
        timeline: false,
        graph: false,
        insights: false
    };
    App.DEBUG = false;

    // get wrapper, logs and calls the callback or fail fn
    App.utils.httpGet = function httpGet(url, params, success, fail) {
        if (App.DEBUG) {
            console.log('[GET] ' + url);
        }
        if (typeof params === 'function') {
            params = {};
            success = arguments[1];
            fail = arguments[2];
        } else {
            if (App.DEBUG) {
                console.log('[GET] params: ', params);
            }
        }
        if (!success) {
            console.error('[GET]', url, ' no success handler supplied');
        }
        return $.get(url, params || {}).done(success).fail(fail || displayFailMessage);
    };

    App.Router = Backbone.Router.extend({
        routes: {
            ':user/:repo/timeline': 'timeline',
            ':user/:repo'         : 'timeline',
            ':user/:repo/graphs'  : 'graphs',
            ':user/:repo/insights': 'insights',
            '*index'              : 'index'
        }
    });

    App.Views = {};
    App.Views.Topbar = Backbone.View.extend({
        el: $('#topbar .menu'),
        events: {
            'click li': 'changeView'
        },

        changeView: function(item) {
            var $el = $(item.target);
            var action = $el.text().toLowerCase();
            location.hash = '/' + App.REPO + '/' + action;
            $('.menu li').removeClass('selected');
            $('li[data-tab=tab-' + action + ']').addClass('selected');
        }
    });

    App.Views.RepoSelector = Backbone.View.extend({
        el: $('#repo-select-trigger'),
        initialize: function() {
            getAllRepos(addRepos);
        },
        events: {
            'click'   : 'toggle',
            'click li': 'switchRepo'
        },
        toggle: function() {
            var $container = $('.repo-select');
            var $repoList = $('ul', $container);

            $container.toggleClass('hidden');
            $repoList.addClass('show--fade-in');

            if ($container.hasClass('hidden')) {
                $('.show--fade-in').removeClass('show--fade-in');
            } else {
                var cb = this.hideTooltip.bind(this);
                $(window).on('keydown', cb);
            }
        },
        hideTooltip: function(e) {
            if (e.keyCode == 27) { // ESC
                $(window).off('keydown');
                this.toggle();
            }

        },
        switchRepo: function(event) {
            $('.menu li').removeClass('selected');
            // remove all the events in the timeline
            // leave in only the loading spinner
            var repo = $(event.target).text();
            emptyTimeline();
            location.hash = '/' + repo + '/timeline';
        }
    });

    App.Views.PullIssueBadge = Backbone.View.extend({
        el: $('#pull-issue-badges'),
        initialize: function() {
            populateOpenIssues();
            populateOpenPulls();
        }
    });

    var topbar = new App.Views.Topbar();
    var repoSelecttor = new App.Views.RepoSelector();
    var pullIssueBadge;
    var appRouter = new App.Router();

    appRouter.on('route:index', function() {
        getRandomRepo(function(repo) {
            location.hash = '/' + repo + '/timeline';
        });
    });

    function initIssuePullBadges() {
        pullIssueBadge = new App.Views.PullIssueBadge();
    }

    appRouter.on('route:insights', function(user, repo){
        if (App.DEBUG) {
            console.log('[INSIGHTS]');
        }
        if (arguments.length > 3) {
            console.error('Bad request. Format is /<user>/<repo>/insights');
            if (App.DEBUG) {
                console.log(arguments);
            }
            return;
        }
        checkForRepo(user, repo, function(res) {
            if (res) {

                App.REPO = user + '/' + repo;
                App.BASE = App.HOST + '/' + App.REPO;

                $('#user-repo').text(App.REPO);

                if (!App.Components.insights) {
                    drawInsights();
                    App.Components.insights = true;
                }
                $('.tab').hide();
                $('#tab-insights').removeClass('hide').show();

                stopScrollListener();
                initIssuePullBadges();

            }
        });
    });

    appRouter.on('route:graphs', function(user, repo) {
        if (App.DEBUG) {
            console.log('[GRAPHS]');
        }
        if (arguments.length > 3) {
            console.error('Bad request. Format is /<user>/<repo>/graph');
            if (App.DEBUG) {
                console.log(arguments);
            }
            return;
        }
        checkForRepo(user, repo, function(res) {
            if (res) {

                App.REPO = user + '/' + repo;
                App.BASE = App.HOST + '/' + App.REPO;

                $('#user-repo').text(App.REPO);

                if (!App.Components.graph) {
                    drawGraphs();
                    App.Components.graph = true;
                }
                $('.tab').hide();
                $('#tab-graphs').show();

                stopScrollListener();
                initIssuePullBadges();

            }
        });
    });

    appRouter.on('route:timeline', function(user, repo) {
        checkForRepo(user, repo, function(res) {
            if (res) {
                if (App.DEBUG) {
                    console.log('[TIMELINE] ' + user + ' ' + repo);
                }
                $('.tab').hide();
                $('#tab-timeline').show();

                App.REPO = user + '/' + repo;
                App.BASE = App.HOST + '/' + App.REPO;

                $('#user-repo').text(App.REPO);

                if (!App.Components.timeline) {
                    initTimeline();
                    App.Components.timeline = true;
                }
                initIssuePullBadges();
                addScrollListener();
            } else {
                console.error('No such repo');
            }
        });
    });

    function checkForRepo(user, repo, fn) {
        var url = App.HOST + '/available_repos';
        var s = user + '/' + repo;
        App.utils.httpGet(url, function(data) {
            var r = data.data.some(function(repo) {
                return repo.match(s);
            });
            fn(r);
        });
    }

    function getAllRepos(cb) {
        var url = App.HOST + '/available_repos';
        App.utils.httpGet(url, cb);
    }

    // make a request for all available repos
    // call the callback with a random repo
    function getRandomRepo(fn) {
        getAllRepos(function(data) {
            var idx = parseInt(Math.random() * 100 % data.data.length, 10);
            var randomRepo = data.data[idx];
            fn(randomRepo);
        });
    }

    // generic fail method for logging
    function logFailure(data) {
        if (App.DEBUG) {
            console.log('Request failed.');
            console.log(data);
        }
    }

    // populate repo tooltip with all available repos
    function addRepos (data) {
        var $container = $('.repo-select');

        var $repoList = $('ul', $container);
        data.data.forEach(function (repo) {
            // TODO add actual links
            var repoLink = $('<a/>').text(repo);
            var repoLI = $('<li/>').append(repoLink);
            $repoList.append(repoLI);
        });
    }

    function initTimeline() {
        emptyTimeline();
        populateTimeline();
    }

    function addScrollListener() {
        var $timeline = $('#timeline');
        $(document).on('scroll', function () {
            if (App.DEBUG) {
                console.log('[TIMELINE] scroll listener');
            }
            if($(window).scrollTop() + $(window).height() >= $(document).height() - 10) {
                populateTimeline(App.PER_PAGE, $timeline.children('.timeline-item').length);
            }
        });
    }

    function stopScrollListener() {
        $(document).off('scroll');
    }

    function populateOpenIssues() {
        App.utils.httpGet(App.BASE + "/issues_count", function (data) {
            var count = data.data.open;
            var $el = $('#open-issues-count');
            var url = 'http://github.com/' + App.REPO + '/issues?state=open';

            $el.text(count).attr('href', url);
        });
    }

    function populateOpenPulls() {
        App.utils.httpGet(App.BASE + "/pulls_count", function (data) {
            var count = data.data.open;
            var $el = $('#open-pulls-count');
            var url = 'http://github.com/' + App.REPO + '/pulls?state=open';

            $el.text(count).attr('href', url);
        });
    }

    Backbone.history.start();

    $(window).on('hashchange', function(e) {
        // if hash has changed but it's the same repo
        if (location.hash.match(App.REPO)) return;
        App.Components = {
            timeline: false,
            graph: false,
            insights: false
        };
    });

})();

function logFailure(msg) {
    console.log('[FAILURE]', msg.statusText);
}

function displayFailMessage(fail) {

    var $tabContainer = $('#tab-container');

    if (fail.status != 404) {
        logFailure(fail);
        return;
    }

    $('#counts-container').remove();
    $tabContainer.empty();

    var msg = "<p class=\"text-center\">No data for this repository yet. Retrying in 2 minutes.</p>";
    $tabContainer.append(msg);

    setTimeout(function() {
        location.reload();
    }, 1000 * 60 * 2);
}
