// Login Controller
app.controller('loginCtrl', ['$scope', 'apiService', '$window', function($scope, apiService, $window) {
    if ($window.localStorage.getItem('user')) {
        $window.location.href = 'dashboard.html';
    }

    $scope.login = function() {
        $scope.error = null;
        apiService.login($scope.username, $scope.password).then(
            function(response) {
                if (response.data.success) {
                    $window.localStorage.setItem('user', JSON.stringify({
                        role: response.data.role,
                        name: response.data.name
                    }));
                    $window.localStorage.setItem('token', response.data.token);
                    $window.location.href = 'dashboard.html';
                }
            },
            function(error) {
                $scope.error = error.data && error.data.message ? error.data.message : 'Login failed';
            }
        );
    };
}]);
