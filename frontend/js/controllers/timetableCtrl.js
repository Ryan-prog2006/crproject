// Timetable Controller
app.controller('timetableCtrl', ['$scope', 'apiService', function($scope, apiService) {
    $scope.timetable = [];
    $scope.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    $scope.periods = [1, 2, 3, 5, 6, 7, 8];
    $scope.periodLabels = {
        1: { from: '09:15', to: '10:15' },
        2: { from: '10:15', to: '11:15' },
        3: { from: '11:15', to: '12:15' },
        5: { from: '01:00', to: '02:00' },
        6: { from: '02:00', to: '03:00' },
        7: { from: '03:00', to: '04:00' },
        8: { from: '04:00', to: '05:00' }
    };
    $scope.subjects = [];
    $scope.classrooms = [];
    $scope.newSlot = { day: 'Monday', period_no: 1, batch: 'ALL', is_lab: 0 };

    $scope.loadData = function() {
        apiService.get('/timetable').then(function(res) {
            $scope.timetable = res.data;
        });
        apiService.get('/subjects').then(function(res) { $scope.subjects = res.data; });
        apiService.get('/classrooms').then(function(res) { $scope.classrooms = res.data; });
    };

    $scope.getSlot = function(day, period) {
        return $scope.timetable.filter(s => s.day === day && s.period_no === period);
    };

    $scope.addSlot = function() {
        apiService.post('/timetable', $scope.newSlot).then(function() {
            $scope.loadData();
            alert('Slot added');
        }, function(err) {
            alert('Error adding slot: ' + err.data.error);
        });
    };

    $scope.deleteSlot = function(id) {
        if (confirm('Delete this slot?')) {
            apiService.delete(`/timetable/${id}`).then(function() {
                $scope.loadData();
            });
        }
    };

    $scope.loadData();
}]);
