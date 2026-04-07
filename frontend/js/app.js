// Global AngularJS module
const app = angular.module('smartClassroomApp', []);

// Shared Navigation & Auth Controller
app.controller('navCtrl', ['$scope', '$window', function($scope, $window) {
    const userJson = $window.localStorage.getItem('user');
    if (!userJson && !$window.location.pathname.endsWith('index.html')) {
        $window.location.href = 'index.html';
    }

    if (userJson) {
        $scope.currentUser = JSON.parse(userJson);
    }

    $scope.logout = function() {
        $window.localStorage.removeItem('user');
        $window.localStorage.removeItem('token');
        $window.location.href = 'index.html';
    };

    $scope.isAdminOrCR = function() {
        return $scope.currentUser && ($scope.currentUser.role === 'admin' || $scope.currentUser.role === 'cr');
    };
}]);
