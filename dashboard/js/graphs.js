(function(){
    'use strict';

    window.App = window.App || {};
    App.utils = {};

    App.utils.makeLink = function makeLink(url, text) {
        var link = $('<a />', {
            href: url,
            text: text,
        });
        return $('<div />').append(link).html();
    };

    function makeList(container, options) {
        $.getJSON(App.BASE + options.endpoint)
            .done(function (json) {
                $container = $(container);
                $container.append($('<h3 />').text(options.title).addClass('text-center'));
                $list = $('<ul />');

                data = json.data;
                data.forEach(function (e) {
                    $item = $('<li />');
                    if (typeof options.keyName === 'function') {
                        $item.html(options.keyName(e));
                    } else {
                        $item.html(e[options.keyName]);
                    }
                    $list.append($item);
                });
                $container.append($list);
            }).fail(displayFailMessage);
    }

    App.utils.makeXYGraph = function makeXYGraph(container, options) {
        $.getJSON(App.BASE + options.endpoint)
            .done(function (json) {
                var data = json.data;
                $(container).highcharts({
                    chart: {
                        type: options.type
                    },
                    title: {
                        text: options.title
                    },
                    subtitle: {
                        text: options.subtitle
                    },
                    xAxis: {
                        categories: data.map(function (e) {
                            if (typeof options.keyName === 'function') {
                                return options.keyName(e);
                            }
                            return e[options.keyName];
                        })
                    },
                    yAxis: {
                        min: 0,
                    title: {
                        text: options.yTitle
                    }
                    },
                    legend: {
                        enabled: false
                    },
                    series: [{
                        name: options.label,
                        data: data.map(function (e) {
                            if (typeof options.valueName === 'function') {
                                return options.valueName(e);
                            }
                            return e[options.valueName];
                        })
                    }]
                });
            }).fail(displayFailMessage);
    }

    function makeStackedSeries(data, valueKey) {
        // find all the series
        var seriesNames = [];
        var seriesNames2 = [];
        var i, j;
        for (i = 0; i < data.length; ++i) {
            var values = data[i][valueKey];
            var keys = Object.keys(values);
            for (j = 0; j < keys.length; ++j) {
                var category = keys[j];
                if (seriesNames.indexOf(category) === -1) {
                    seriesNames.push(category);
                }
            }
        }

        // get the actual values
        var series = [];
        for (i = 0; i < seriesNames.length; ++i) {
            var s = {
                name: seriesNames[i],
                data: []
            };
            for (j = 0; j < data.length; ++j) {
                var d = data[j][valueKey];
                if (d[s.name]) {
                    s.data.push(d[s.name]);
                } else {
                    s.data.push(0);
                }
            }
            series.push(s);
        }
        return series;
    }

    window.makeStackedGraph = function makeStackedGraph(container, options) {
        var graph = {
            chart: {
                type: options.type
            },
            title: {
                text: options.title
            },
            subtitle: {
                text: options.subtitle
            },
            xAxis: {
                categories: options.categories,
                title: {
                    enabled: true
                }
            },
            yAxis: {
                title: {
                    text: options.yTitle
                },
                min: 0
            },
            legend: {
                labelFormatter: options.legendFormatter
            },
            tooltip: {
                shared: true,
                valueSuffix: ' ' + options.suffix,
                formatter: options.tooltipFormatter
            },
            plotOptions: {},
            series: options.series
        };
        graph.plotOptions[options.type] = {
            stacking: 'normal',
            fillOpacity: 1,
            lineColor: '#666666',
            lineWidth: 1,
            marker: {
                enabled: false
            }
        };
        $(container).highcharts(graph);
    };

    function drawActivityGraph() {
        $.getJSON(App.BASE + '/total_events_monthly')
            .done(function(data) {
                var series = makeStackedSeries(data.data, 'value');
                var categories = data.data.map(function (e) {
                    return e.month;
                });

                var options = {
                    type: 'column',
            title: "Activity",
            subtitle: "Total monthly events",
            yTitle: 'Events',
            suffix: 'events',
            series: series,
            categories: categories,
            legendFormatter: function () {
                var label = this.name;
                var idx = label.indexOf("Event");
                if (idx == -1) {
                    idx = label.indexOf("event");
                }
                return label.substr(0, idx);
            }
                };
                makeStackedGraph('#total-events-monthly', options);
            })
        .fail(displayFailMessage);
    }

    function drawActivePeopleGraph() {
        $.getJSON(App.BASE + '/most_active_people')
            .done(function(data) {
                var series = makeStackedSeries(data.data, 'events');
                var categories = data.data.map(function (e) {
                    return e.login;
                });

                var options = {
                    type: 'bar',
                    title: "Most active people",
                    subtitle: "By number of events",
                    yTitle: 'Events',
                    suffix: 'events',
                    series: series,
                    categories: categories,
                    legendFormatter: function () {
                        var label = this.name;
                        var idx = label.indexOf("Event");
                        if (idx == -1) {
                            idx = label.indexOf("event");
                        }
                        return label.substr(0, idx);
                    }
                };
                makeStackedGraph('#most-active-people', options);
            }).fail(displayFailMessage);
    }

    function drawPopularityEvolutionGraph() {
        $.getJSON(App.BASE + '/popularity_evolution')
            .done(function(data) {
                var series = makeStackedSeries(data.data, 'value');
                var categories = data.data.map(function (e) {
                    return e.month;
                });

                var options = {
                    type: 'column',
            title: "Monthly Popularity Increase",
            subtitle: "Number of new stars and forks",
            yTitle: 'Events',
            suffix: '',
            series: series,
            categories: categories,
            legendFormatter: function () {
                return this.name;
            }
                };
                makeStackedGraph('#popularity-evolution', options);
            })
        .fail(displayFailMessage);
    }

    window.drawGraphs = function drawGraphs() {
        drawActivePeopleGraph();
        drawActivityGraph();
        drawPopularityEvolutionGraph();

        App.utils.makeXYGraph('#most-active-issues', {
            endpoint: '/most_active_issues',
            type: 'bar',
            title: "Most active issues",
            keyName: function (e) {
                return App.utils.makeLink('http://github.com/' + App.REPO + '/issues/' + e.term,
                    "#" + e.term);
            },
            valueName: 'count',
            yTitle: 'Events',
            label: 'events'
        });
    };

})();
