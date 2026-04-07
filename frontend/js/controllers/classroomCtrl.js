// Classroom Controller
app.controller('classroomCtrl', ['$scope', 'apiService', function($scope, apiService) {
    $scope.rooms = [];
    $scope.filter = 'all';
    $scope.subjects = [];

    $scope.loadRooms = function() {
        apiService.get('/classrooms').then(function(res) { $scope.rooms = res.data; });
    };

    $scope.loadSubjects = function() {
        apiService.get('/subjects').then(function(res) { $scope.subjects = res.data; });
    };

    $scope.filterRooms = function(room) {
        if ($scope.filter === 'all') return true;
        if ($scope.filter === 'available') return room.status === 'available';
        if ($scope.filter === 'occupied') return room.status === 'occupied';
        if ($scope.filter === 'labs') return room.room_name.toLowerCase().includes('lab');
        if ($scope.filter === 'theory') return !room.room_name.toLowerCase().includes('lab') && !room.room_name.toLowerCase().includes('s-');
        return true;
    };

    $scope.openModal = function(room) {
        $scope.selectedRoom = angular.copy(room);
        $scope.showModal = true;
    };

    $scope.closeModal = function() {
        $scope.showModal = false;
        $scope.selectedRoom = null;
    };

    $scope.updateStatus = function() {
        apiService.put(`/classrooms/${$scope.selectedRoom.id}/status`, {
            status: $scope.selectedRoom.status,
            occupied_by: $scope.selectedRoom.occupied_by
        }).then(function() {
            $scope.loadRooms();
            $scope.closeModal();
        });
    };

    $scope.loadRooms();
    $scope.loadSubjects();
}]);
