/*
 * Initialize the angular application 
 * 
 */

angular.module('coptic', ['csFilters', 'ngSanitize', 'ngRoute', 'headroom']).config(function ($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        'https://corpling.uis.georgetown.edu/**']);
});


angular.module('csFilters', [])

    // Capitalize filter
    .filter('capitalize', function () {
        return function (input, all) {
            return (!!input) ? input.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }) : '';
        }
    })

    // Turn input string into slug
    .filter('slugify', function () {
        return function (input, all) {
            return (!!input) ? input
                .toLowerCase()
                .replace(/[^\w ]+/g, '')
                .replace(/ +/g, '-')
                : '';
        }
    })


    // Trust HTML for ng-bind
    .filter('unsafe', function ($sce) {
        return $sce.trustAsHtml;
    });


/*
 * Routes for client-side angular application
 */
angular.module("coptic")
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        });
        $routeProvider.
            // Single text with HTML Version
            when('/texts/:corpus_slug/:text_slug/:html_version', {
                controller: 'TextController'
            }).
            // Single text
            when('/texts/:corpus_slug/:text_slug', {
                controller: 'TextController'
            }).
            // Text index
            when('/texts/', {
                controller: 'TextController'
            }).
            // Filter with search tools
            when('/filter/:filters', {
                controller: 'TextController'
            }).
            // Filter with search tools
            when('/urn*coptic_urn', {
                controller: 'TextController'
            }).
            // Otherwise, index
            otherwise({
                redirectTo: '/'
            });
    });

/*
 * Site-specific functions
 */

(function ($) {
    angular.element(document).ready(function () {

        window.__cs__ = window.__cs__ || {};
        var Cs = window.__cs__;

// fix iOS font related issues 
        if (navigator.userAgent.match(/iPad/i)) {
            $("html").addClass("ipad");
        }

// js - modernizer
        $('.no-js').removeClass('no-js').addClass('js');

        var modiDate = new Date(document.lastModified);
        var showAs = (modiDate.getMonth() + 1) + "-" + modiDate.getDate() + "-" + modiDate.getFullYear();
        $("#lastupdate").html("Page last updated: " + showAs);
    });
})(jQuery);

/*
 * Text controller, primary application controller for single / list toggling 
 * and search tool functionality
 */
angular.module('coptic')
    .controller('TextController', ['$scope', '$http', '$location', function ($scope, $http, $location) {

        // Persistent location Path
        $scope.path = location.pathname.split("/");

        // Filters for the search tools
        $scope.filters = [];

        // Text Query based on filters and selected texts
        $scope.text_query = {};

        // The texts returned from the API
        $scope.texts = [];

        // The selected text value for single text view
        $scope.selected_text = null;

        // If the application is in the single text view
        $scope.is_single = false;

        // The selected text HTML visualization format
        $scope.selected_text_format = "";

        // The URN entered in the header URN input field
        $scope.entered_urn = "";

        // The free text search from the search tools text search input field
        $scope.text_search = "";

        /*
         * Run update after each location change for controller lifecycle logic
         */
        $scope.$on('$locationChangeSuccess', function (e) {
            $scope.update();
        });

        /*
         *  Watch the selected text to determine when Selected Text templating completes
         */
        $scope.$watch(
            function () {
                return document.getElementById("selected_text").innerHTML
            },
            function (val) {
                if ($(".text-format").length > 0) {
                    if ($scope.path.length < 4) {
                        $scope.hide_loading_modal();

                    } else {
                        if ($scope.path[4] !== $scope.selected_text_format) {
                            $scope.toggle_text_format($scope.path[4]);
                            $scope.hide_loading_modal();
                        } else {
                            $scope.hide_loading_modal();
                        }
                    }
                }
            }
        );

        /*
         *  Update: manages primary lifecycle for the angular application
         */
        $scope.update = function () {
            console.log('Update function, location path: ' + location.pathname);
            $scope.path = location.pathname.split("/");

            if ($scope.path.length == 0 || ( $scope.path.length > 1 && $scope.path[1] === "" )) {

                // Index
                $scope.show_loading_modal();
                $scope.is_single = false;
                $scope.selected_text = null;

                // Default to displaying no texts, only show the landing page description text
                $scope.texts = [];
                $scope.hide_loading_modal();

                // Wipe Search Terms / Filters
                $scope.filters = [];
                $(".selected").removeClass("selected");
                $("meta[name=corpus_urn]").attr("content", "");
                $("meta[name=document_urn]").attr("content", "");
                $("meta[name=mss_urn]").attr("content", "");
            } else if ($scope.path.length === 2 && $scope.path[1] !== "404") {

                // /texts index
                $scope.show_loading_modal();
                $scope.is_single = false;
                $scope.selected_text = null;
                $scope.selected_text_format = null;

                // Default to displaying no texts, only show the landing page description text
                $scope.texts = [];
                $scope.hide_loading_modal();

                // Wipe Search Terms / Filters
                $scope.filters = [];
                $(".selected").removeClass("selected");
                $("meta[name=corpus_urn]").attr("content", "");
                $("meta[name=document_urn]").attr("content", "");
                $("meta[name=mss_urn]").attr("content", "");


            } else if ($scope.path.length === 3) {

                // /filters/:filters
                if ($scope.path[2].length !== 0) {
                    // load filters
                    $scope.load_filters();

                    // Ensure single is null
                    $scope.is_single = false;
                    $scope.selected_text = null;
                    $scope.selected_text_format = null;
                } else {
                    // Default to displaying no texts, only show the landing page description text
                    $scope.texts = [];

                    // Wipe Search Terms / Filters
                    $scope.filters = [];
                    $(".selected").removeClass("selected");
                    $("meta[name=corpus_urn]").attr("content", "");
                    $("meta[name=document_urn]").attr("content", "");
                    $("meta[name=mss_urn]").attr("content", "");
                }

            } else if ($scope.path.length === 4) {

                // Single text (/text/:corpus_slug/:text_slug)
                $(".text-format").hide();
                $scope.show_loading_modal();
                $scope.is_single = true;
                $scope.selected_text_format = null;

                if ($scope.texts.length === 0) {
                    $scope.get_corpora({
                        model: "corpus",
                        filters: $scope.filters
                    });
                } else {
                    $scope.show_single();
                }

            } else if ($scope.path.length === 5) {
                // Single text html version (/text/:corpus_slug/:text_slug/:html_version)
                if ($scope.is_single === true) {
                    $scope.toggle_text_format($scope.path[4]);
                } else {
                    $scope.show_loading_modal();
                    $scope.is_single = true;

                    if ($scope.texts.length === 0) {
                        $scope.get_corpora({
                            model: "corpus",
                            filters: $scope.filters
                        });
                    } else {
                        $scope.show_single();
                    }
                }
            }
        };

        /*
         * Gets corpora via the API, and processes them
         */
        $scope.get_corpora = function (query) {
            $scope.selected_text = null;
            $(".text-subwork").removeClass("hidden");
            $(".text-work").removeClass("hidden");
            $(".work-title-wrap").removeClass("hidden");
            $(".single-header").removeClass("single-header");

            $http.get("/api/", {params: query}).then(function (response) {
                $scope.update_texts(response.data);
                if ($scope.is_single && $scope.path[4] !== $scope.selected_text_format) {
                    $scope.show_single();
                } else {
                    $scope.hide_loading_modal();
                }
            }, function (response) {
                console.log('Error with API Query:', response);
            });
        };

        /*
         * Gets texts via the API, and processes them
         */
        $scope.get_texts = function (query) {
            $http.get("/api/", {params: query}).then(function (response) {
                $scope.update_texts(response.data);
            }, function (response) {
                console.log('Error with API Query:', response);
            });
        };

        /*
         * Updates texts with returned data from API query
         */
        $scope.update_texts = function (res) {
            var texts = []
                , edition_urn
                , $target
                ;

            // If it is a corpus response
            if (typeof res.corpus !== "undefined") {

                // Ensure that if the path is /, no texts are added (only the project
                // description text should be shown)
                if ($scope.path.length > 0) {
                    res.corpus.forEach(function (corpus) {
                        texts.push(corpus);
                    });

                    $scope.texts = texts;

                    if ($scope.is_single) {
                        // Toggle the specific classes and visibility on elements
                        $target = $(".text-subwork[data-text-slug='" + $scope.text_query.text_slug + "'][data-corpus-slug='" + $scope.text_query.corpus_slug + "']");
                        $(".text-subwork").addClass("hidden");
                        $(".text-work").addClass("hidden");
                        $(".work-title-wrap").addClass("hidden");
                        $target.parents(".text-work").removeClass("hidden");
                        $target.removeClass("hidden").addClass("single-header");
                    }
                } else {
                    $scope.texts = [];
                }
            } else if (typeof res.texts !== "undefined") {
                // Texts response

                // Should handle the possibility of multiple selected in future
                $scope.selected_text = res.texts[0];
                $scope.filters = [];

                // Set pertinent metadata directly to the selected_text object
                $scope.selected_text.text_meta.forEach(function (meta) {
                    if (meta.name === "document_cts_urn") {
                        $scope.selected_text.edition_urn = meta.value;
                        edition_urn = meta.value.split(":");
                        edition_urn = edition_urn[3].split(".");
                        $scope.selected_text.textgroup_urn = edition_urn[0];
                        $scope.selected_text.corpus_urn = edition_urn[1];
                    }
                });

                // Toggle the specific classes and visibility on elements
                $target = $(".text-subwork[data-text-slug='" + $scope.text_query.text_slug + "'][data-corpus-slug='" + $scope.text_query.corpus_slug + "']");
                $(".text-subwork").addClass("hidden");
                $(".text-work").addClass("hidden");
                $(".work-title-wrap").addClass("hidden");
                $target.parents(".text-work").removeClass("hidden");
                $target.removeClass("hidden").addClass("single-header");

                // Set the HTML document meta elements
                $("meta[name=corpus_urn]").attr("content", "urn:cts:" + $scope.selected_text.corpus_urn);
                $("meta[name=document_urn]").attr("content", $scope.selected_text.edition_urn);

                // Scroll back to the top
                $('html,body').scrollTop(0);

                // Hide the loading modal window
                $scope.hide_loading_modal();
            }
        };


        $scope.show_single = function (e) {
            // Show a selected single text
            $(".text-format").hide();
            $scope.text_query = {
                model: "texts",
                corpus_slug: $scope.path[2],
                text_slug: $scope.path[3]
            };
            $scope.get_texts($scope.text_query);
        };

        $scope.load_single_iframe = function (is_expired, corpus_annis_name, selected_text_name, visualization_slug) {
            // Load an iframe src elem

            if (is_expired) {
                return "https://corpling.uis.georgetown.edu/annis/embeddedvis/htmldoc/" + corpus_annis_name + "/" + selected_text_name + "?config=" + visualization_slug;
            } else {
                return "";
            }
        };

        $scope.toggle_tool_panel = function (e) {
            // Toggle the search tool panels
            var $target = $(e.target)
                , $panel
                ;

            if (!$target.hasClass("tool-head")) {
                $target = $target.parents(".tool-head");
            }

            $panel = $target.parents(".tool-wrap").children(".tool-panel");
            $(".keys-shown").removeClass("keys-shown");

            if ($panel.hasClass("hidden")) {
                $(".tool-panel").addClass("hidden");
                $(".tool-head-selected").removeClass("tool-head-selected");
                $target.addClass("tool-head-selected");
                $panel.removeClass("hidden");
            } else {
                $target.removeClass("tool-head-selected");
                $panel.addClass("hidden");
            }
        };

        $scope.toggle_search_term = function (e) {
            // Add or remove a search term from the query
            var $target = $(e.target)
                , search_obj = {}
                , filters_url = []
                , filter
                , field
                , id
                ;

            $scope.show_loading_modal();
            $scope.text_query = {};

            if (!$target.hasClass("tool-search-item")) {
                $target = $target.parents(".tool-search-item");
            }

            filter = $target.data().filter;
            id = $target.data().searchid;
            field = $target.parents(".tool-wrap").data().field;
            search_obj = {
                id: id,
                filter: filter,
                field: field
            };

            if (!$target.hasClass("selected")) {
                $target.addClass("selected");
                $scope.filters.push(search_obj);
            } else {
                $target.removeClass("selected");
                $scope.filters = $scope.filters.filter(function (obj) {
                    return obj.filter !== search_obj.filter;
                });
            }

            $scope.filters.forEach(function (f) {
                filters_url.push(f.field + "=" + f.id + ":" + f.filter);
            });
            filters_url = filters_url.join("&");
            $location.path("/filter/" + filters_url);

            $scope.text_query = {
                model: "corpus",
                filters: $scope.filters
            };

            $scope.selected_text = null;
        };

        $scope.add_text_search = function () {
            // Add a textsearch to the filters
            var has_text_search = false
                , filters_url = []
                , filters_length = $scope.filters.length
                ;

            if ($scope.text_search.length > 0) {

                $scope.filters.forEach(function (filter) {
                    if (filter.field === "text_search") {
                        has_text_search = true;
                        filter.filter = $scope.text_search;
                    }
                });

                if (!has_text_search) {
                    $scope.filters.push({
                        id: 0,
                        field: "text_search",
                        filter: $scope.text_search
                    });
                }

                $scope.filters.forEach(function (f) {
                    filters_url.push(f.field + "=" + f.id + ":" + f.filter);
                });
                filters_url = filters_url.join("&");

                if ($scope.filters.length > 0) {
                    $location.path("/filter/" + filters_url);
                }

                $scope.text_query = {
                    model: "corpus",
                    filters: $scope.filters
                };

                $scope.selected_text = null;
                $scope.get_corpora($scope.text_query);


            } else {

                $scope.filters = $scope.filters.filter(function (obj) {
                    return obj.field !== "text_search"
                });

                if ($scope.filters.length < filters_length) {
                    $location.path("/");

                    // Update the text_query
                    $scope.text_query = {
                        model: "corpus",
                        filters: $scope.filters
                    };

                    $scope.selected_text = null;
                    $scope.get_corpora($scope.text_query);

                }

            }
        };

        $scope.load_filters = function () {
            // load the filters from the URL to the object
            var filter_url = $scope.path[2].split("&");

            $scope.filters = [];

            // Process filter URLs
            filter_url.forEach(function (filter) {
                var filter_value;
                filter = decodeURI(filter);
                filter = filter.split("=");

                // if filter contains a key val pair demarcated by =
                if (filter.length > 1) {
                    filter_value = filter[1].split(":");

                    $scope.filters.push({
                        id: filter_value[0],
                        filter: filter_value[1],
                        field: filter[0]
                    });
                    $(".tool-search-item[data-searchid='" + filter_value[0] + "']").addClass("selected");

                    if (filter[0] === "text_search") {
                        $(".text-search-input").val(filter_value[1]);
                        $scope.text_search = filter_value[1];
                    }
                }

            });

            $scope.text_query = {
                model: "corpus",
                filters: $scope.filters
            };

            $scope.selected_text = null;
            $scope.get_corpora($scope.text_query);

        };


        $scope.remove_search_term = function (e) {
            var $target = $(e.target)
                , filter
                , field
                , filters_url = []
                ;

            $scope.show_loading_modal();
            if (!$target.hasClass("filter-item")) {
                $target = $target.parents(".filter-item");
            }

            filter = $target.data().filter;
            field = $target.data().field;

            $(".tool-search-item[data-filter='" + filter + "']").removeClass("selected");
            $scope.filters = $scope.filters.filter(function (obj) {
                return obj.filter !== filter;
            });

            if (field === "text_search") {
                $(".text-search-input").val('');
                $scope.text_search = "";
            }

            $scope.text_query = {
                model: "corpus",
                filters: $scope.filters
            };

            $scope.filters.forEach(function (f) {
                filters_url.push(f.field + "=" + f.id + ":" + f.filter);
            });
            filters_url = filters_url.join("&");

            if ($scope.filters.length > 0) {
                $location.path("/filter/" + filters_url);
                $scope.get_corpora($scope.text_query);

            } else {
                $location.path("/");
                $scope.texts = [];

            }
        };


        $scope.clear_all_search_terms = function () {
            $location.path("/");
        };


        $scope.toggle_text_format = function (type) {
            // Show or hide the different text formats;
            var $target
                ;

            $scope.selected_text_format = type;

            $target = $(".single-header .text-item[data-type=" + type + "]");
            if (!$target.hasClass("selected-text-type")) {

                // Update the displayed text format if not currently selected
                $(".selected-text-type").removeClass("selected-text-type");
                $target.addClass("selected-text-type");

                $(".selected-text-format").fadeOut().removeClass("selected-text-format");
                $("#" + type).fadeIn().addClass("selected-text-format");
            }

        };

        $scope.raise_dropdowns = function () {
            $(".tool-panel").addClass("hidden");
        };

        $scope.urn_submit = function () {
            document.location.href = "/" + $scope.entered_urn;
        };

        $scope.show_loading_modal = function () {
            $("#loading_modal").fadeIn(300);
        };

        $scope.hide_loading_modal = function () {
            $("#loading_modal").fadeOut(300);
        };

    }]);
