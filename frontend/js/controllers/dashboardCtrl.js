// Dashboard Controller
app.controller('dashboardCtrl', ['$scope', 'apiService', function($scope, apiService) {
    $scope.summary = {};
    $scope.today = new Date();
    $scope.crList = [];
    $scope.selectedResetCR = '';
    $scope.resetting = false;

    $scope.loadDashboard = function() {
        apiService.get('/dashboard/summary').then(function(res) {
            $scope.summary = res.data;
            
            // Group subjects for sidebar
            const groups = {};
            res.data.subjects.forEach(sub => {
                const baseName = sub.name.split(' (')[0];
                if (!groups[baseName]) {
                    groups[baseName] = { name: baseName, color: sub.color_code, tracks: [] };
                }
                groups[baseName].tracks.push(sub);
            });
            $scope.subjectGroups = Object.values(groups);
        });
    };

    // Load CR list for admin reset feature
    $scope.loadCRList = function() {
        var user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'admin') {
            apiService.get('/dashboard/cr-list').then(function(res) {
                $scope.crList = res.data;
            });
        }
    };

    $scope.isCurrentPeriod = function(period) {
        const now = new Date();
        const curTimeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
        return curTimeStr >= period.time_from && curTimeStr <= period.time_to;
    };

    $scope.markConducted = function(slot) {
        const data = {
            subject_code: slot.subject_code,
            timetable_id: slot.id,
            date: new Date().toISOString().split('T')[0],
            period_no: slot.period_no,
            status: 'conducted'
        };
        apiService.post('/attendance', data).then(function() {
            alert('Marked as conducted');
            $scope.loadDashboard();
        });
    };

    $scope.markAction = function(subjectCode, status) {
        if (!subjectCode) return alert('Select a subject first');
        
        const data = {
            subject_code: subjectCode,
            date: new Date().toISOString().split('T')[0],
            status: status,
            notes: status === 'extra' ? 'Extra class added' : ''
        };
        
        apiService.post('/attendance', data).then(function() {
            alert(`Subject ${subjectCode} marked as ${status}`);
            $scope.loadDashboard();
        });
    };

    // Semester Reset
    $scope.resetCRData = function() {
        if (!$scope.selectedResetCR) return alert('Please select a CR first');

        var selectedCR = $scope.crList.find(function(cr) { return cr.id == $scope.selectedResetCR; });
        var crName = selectedCR ? selectedCR.name : 'this CR';

        if (!confirm('⚠️ WARNING: This will permanently delete ALL data for ' + crName + ' (subjects, timetable, attendance).\n\nThis action CANNOT be undone.\n\nAre you sure?')) return;
        if (!confirm('Final confirmation: Reset ALL data for ' + crName + '?')) return;

        $scope.resetting = true;
        apiService.post('/upload/reset/' + $scope.selectedResetCR, {}).then(function(res) {
            $scope.resetting = false;
            alert('✅ ' + res.data.message);
            $scope.selectedResetCR = '';
            $scope.loadDashboard();
        }, function(err) {
            $scope.resetting = false;
            alert('❌ Reset failed: ' + (err.data ? err.data.error : err.statusText));
        });
    };

    $scope.loadDashboard();
    $scope.loadCRList();
}]);

