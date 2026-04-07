// Progress Controller
app.controller('progressCtrl', ['$scope', 'apiService', function($scope, apiService) {
    $scope.subjects = [];
    $scope.attendance = [];

    $scope.subjectGroups = [];

    $scope.loadProgress = function() {
        apiService.get('/subjects').then(function(res) {
            $scope.subjects = res.data;
            // Group by base name
            const groups = {};
            res.data.forEach(sub => {
                const baseName = sub.name.split(' (')[0];
                if (!groups[baseName]) {
                    groups[baseName] = { 
                        name: baseName, 
                        color: sub.color_code,
                        faculty: sub.faculty,
                        tracks: [] 
                    };
                }
                groups[baseName].tracks.push(sub);
            });
            $scope.subjectGroups = Object.values(groups);
        });
        apiService.get('/attendance').then(function(res) {
            $scope.attendance = res.data;
        });
    };

    $scope.getStatus = function(percent) {
        if (percent >= 60) return 'On Track';
        if (percent >= 40) return 'Behind';
        return 'Critical';
    };

    $scope.getStatusColor = function(percent) {
        if (percent >= 60) return '#27ae60';
        if (percent >= 40) return '#f39c12';
        return '#e74c3c';
    };

    $scope.markAction = function(subjectCode, status) {
        apiService.post('/attendance', {
            subject_code: subjectCode,
            date: new Date().toISOString().split('T')[0],
            period_no: 1, // Fixed for manual quick action
            status: status
        }).then(function() {
            $scope.loadProgress();
        });
    };

    $scope.updateRequired = function(subject) {
        apiService.put(`/subjects/${subject.id}`, {
            total_required_classes: subject.total_required_classes
        }).then(function() {
            alert('Updated');
            $scope.loadProgress();
        });
    };

    $scope.loadProgress();
}]);
