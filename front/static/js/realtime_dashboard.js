var host = window.location.hostname;
if (window.location.port) {
    host += ":" + window.location.port;
}
var protocol = "ws";
if (window.location.protocol == "https:") {
    protocol = "wss";
}
var ws = null;
var onmessage = null;
function startWS(){
    ws = new WebSocket(protocol + '://' + host);
    if (onmessage != null) {
        ws.onmessage = onmessage;
    }
    ws.onclose = function(){
        // Try to reconnect in 5 seconds
        setTimeout(function(){startWS()}, 5000);
    };
}
startWS();


String.prototype.title = function () {
    return this.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

var app = angular.module('BikiniRepair', ['ngRoute', 'ui.bootstrap'])
.directive('keypressEvents', [
    '$document',
    '$rootScope',
    function($document, $rootScope) {
        return {
            restrict: 'A',
            link: function() {
                $document.bind('keydown', function(e) {
                    $rootScope.$broadcast('keypress', e);
                    $rootScope.$broadcast('keypress:' + e.which, e);
                });
            }
        };
    }
])
.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider
        .when('/job/:id', {
            controller: 'jobController'
        })
        .when('/', {
            controller: 'mainController'
        });
    $locationProvider.html5Mode(false);
}])
.controller('jobModal', ['$rootScope', '$uibModalInstance', '$http', 'job_id', 'parent', function($rootScope, $uibModalInstance, $http, job_id, parent) {
    var $ctrl = this;
    $ctrl.job = null;
    $ctrl.job_id = job_id;
    $ctrl.parent = parent;

    getJob(job_id);

    var deregisterListener = $rootScope.$on('new_job', function(e, event) {
        if (event.job.id !== $ctrl.job_id) {
            getJob(event.job.id);
        }
    });

    function getJob(job_id) {
        $ctrl.job = {id: job_id};
        $http.get('api/job/' + job_id).then(function (response) {
            $ctrl.job = (response.data);
        })
    }

    $uibModalInstance.closed.then(function() {
        deregisterListener();
    });

    $ctrl.ok = function () {
        $uibModalInstance.close();
    };
    $ctrl.nextJob = function () {
        $rootScope.$emit('next_job', 'next');
    };
    $ctrl.previousJob = function () {
        $rootScope.$emit('previous_job', 'next');
    };
}])
.controller('jobController', ['$rootScope', '$scope', '$location', '$routeParams', '$uibModal', '$route', function($rootScope, $scope, $location, $routeParams, $uibModal, $route) {
    var $ctrl = $scope;
    $ctrl.jobs = $scope.$parent.filteredJobs;


    var getIndex = function (jobId) {
        if ($ctrl.jobs == null) {
            return -1;
        }
        for (var i = 0; i < $ctrl.jobs.length; i++) {
            if ($ctrl.jobs[i].id == jobId) {
                return i;
            }
        }
        return -1;
    };

    $scope.$watch("$parent.filteredJobs", function () {
        $ctrl.jobs = $scope.$parent.filteredJobs;
        $ctrl.index = getIndex($routeParams.id);
        if (modalInstance == null) {
            openJob($route.current);
        }
    });

    var modalInstance = null;
    $rootScope.$on('$routeChangeStart', function(next, current) {
        if (modalInstance != null && current.$$route.controller != $route.current.$$route.controller) {
            modalInstance = null;
        }
        $ctrl.index = getIndex(current.params.id);
        openJob(current);
    });

    var openJob = function (current) {
        if (($scope.index === -1) && (current == null || current.params.id == null)) {
            return;
        }
        if (modalInstance == null) {
            var modal = {
                templateUrl: 'modalJob.html',
                controller: 'jobModal'
            };

            var job_id = null;
            if ($scope.index !== -1) {
                job_id = $ctrl.jobs[$scope.index].id;
            } else {
                job_id = current.params.id;
            }

            modalInstance = $uibModal.open({
                animation: true,
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: modal.templateUrl,
                controller: modal.controller,
                controllerAs: '$ctrl',
                size: "lg",
                resolve: {
                    job_id: function () {
                        return job_id;
                    },
                    parent: $ctrl
                }
            });
            modalInstance.result.then(function () {
                modalInstance = null;
                $location.path("/");
            }, function () {
                modalInstance = null;
                $location.path("/");
            })
        }
        $rootScope.$emit('new_job', {
            job: {id: current.params.id}
        });
    };



    var nextJob = function () {
        var index  = $scope.index + 1;
        if (index == $ctrl.jobs.length)  {
            index = 0;
        }

        var path = "/job/" + $ctrl.jobs[index].id;
        $location.path(path);
        if (typeof gtag !== 'undefined') {
            gtag('event', 'next', {
                'event_category': 'Shortcut'
            });
        }
        return false;
    };

    var previousJob = function () {
        var index  = $scope.index - 1;
        if (index < 0) {
            index = $ctrl.jobs.length - 1;
        }

        var path = "/job/" + $ctrl.jobs[index].id;
        $location.path(path);
        if (typeof gtag !== 'undefined') {
            gtag('event', 'previous', {
                'event_category': 'Shortcut'
            });
        }
        return false;
    };

    $scope.$on('keypress:39', function () {
        $scope.$apply(function () {
            nextJob();
        });
    });
    $scope.$on('keypress:37', function () {
        $scope.$apply(function () {
            previousJob();
        });
    });
    $rootScope.$on('next_job', nextJob);
    $rootScope.$on('previous_job', previousJob);
}])
.controller('AppCtrl', ['$scope', '$http', '$location', '$rootScope', '$window', function ($scope, $http, $location, $rootScope, $window) {
    $scope.sortType     = 'id'; // set the default sort type
    $scope.sortReverse  = true;
    $scope.match  = "all";
    $scope.filter   = {
        "errored": true,
        "canceled": true,
        "failed": true,
        "passed": true,
    };
    $scope.search   = "";
    $scope.pageTitle = "Travis RealTime";

    $scope.jobs = [];
    $scope.languages = {};
    $scope.states = {
        "errored": 0,
        "canceled": 0,
        "failed": 0,
        "passed": 0
    };

    $scope.openJob = function(job) {
        $location.path( "/job/" +  job.id);
        return false;
    };
    $scope.sort = function (sort) {
        if (sort == $scope.sortType) {
            $scope.sortReverse = !$scope.sortReverse;
        } else {
            $scope.sortType = sort;
            $scope.sortReverse = false;
        }
        return false;
    };

    $scope.jobFilter = function (job, index, array) {
        var allFalse = true;
        for (var i in $scope.filter) {
            if ($scope.filter[i] === true) {
                allFalse = false;
                break;
            }
        }
        var matchSearch = ($scope.search == '' || $scope.search == null || job.repository_slug.toLowerCase().indexOf($scope.search.toLowerCase()) !== -1);
        if (allFalse) {
            return matchSearch;
        }

        var matchLanguages = false;
        var hasLanguages = false;
        for (var language in $scope.languages) {
            if ($scope.filter[language]) {
                hasLanguages = true;
                if (job.config.language == language) {
                    matchLanguages = true;
                    break;
                }
            }
        }

        var matchStates = false;
        var hasStates = false;
        for (var state in $scope.states) {
            if ($scope.filter[state]) {
                hasStates = true;
                if (job.state == state) {
                    matchStates = true;
                    break;
                }
            }
        }
        if (!hasStates) {
            matchStates = true;
        }
        if (!hasLanguages) {
            matchLanguages = true;
        }

        return matchStates && matchLanguages && matchSearch;
    };

    $scope.humanTime = function (date) {
        date = new Date(date);
        return $scope.humanInterval(Math.floor((new Date() - date) / 1000));
    };

    $scope.humanInterval = function (seconds) {
        if (!seconds) {
            return '';
        }
        var interval = Math.floor(seconds / 31536000);

        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return interval + " h";
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return interval + " min";
        }
        return Math.floor(seconds) + " sec";
    };

    $scope.jobArray = function () {
        var ary = [];
        angular.forEach($scope.jobs, function (val, key) {
            ary.push({key: key, val: val});
        });
        return ary;
    };

    onmessage = function (event) {
        $scope.$apply(function () {
            var data = {};
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                return;
            }
            if (data.event == null) {
                return;
            }
            if (data.event == "job_finished" || data.event == "job" || data.event == "job_updated")  {
                var job = data.data;
                if (job.started_at && job.finished_at) {
                    job.duration = new Date().getTime(job.finished_at) - new Date(job.started_at).getTime();
                } else {
                    job.duration = 0;
                }
                var find = false;

                var language = job.config.language;
                if ($scope.languages[language] == null) {
                    $scope.languages[language] = 1;
                } else {
                    $scope.languages[language]++;
                }
                if ($scope.states[job.state] == null) {
                    $scope.states[job.state] = 1;
                } else {
                    $scope.states[job.state]++;
                }

                for (var i = 0; i < $scope.jobs.length; i++) {
                    if ($scope.jobs[i].id == job.id) {
                        $scope.states[$scope.jobs[i].state] --;

                        $scope.jobs[i] = job;
                        find = true;
                        break;
                    }
                }
                if (!find) {
                    $scope.jobs.push(job);
                }
            }
        });
    };
    ws.onmessage = onmessage;
}]);