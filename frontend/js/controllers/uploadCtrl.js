// Upload Controller
app.controller('uploadCtrl', ['$scope', '$http', '$window', 'apiService', function($scope, $http, $window, apiService) {
    $scope.activeTab = 'timetable';
    $scope.uploading = false;

    // Data holders
    $scope.subjectFile = null;
    $scope.subjectData = [];
    $scope.timetableFile = null;
    $scope.timetableData = [];
    $scope.classroomFile = null;
    $scope.classroomData = [];

    // Toast notification
    $scope.toast = { show: false, message: '', type: 'success' };

    function showToast(message, type) {
        $scope.toast = { show: true, message: message, type: type || 'success' };
        setTimeout(function() {
            $scope.$apply(function() {
                $scope.toast.show = false;
            });
        }, 5000);
    }

    // ─── CSV Parser (handles quoted fields with commas) ───
    function parseCSV(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return [];

        // Parse header
        const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === 0) continue;

            const row = {};
            headers.forEach((header, idx) => {
                let val = (values[idx] || '').trim();
                // Remove surrounding quotes
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.slice(1, -1);
                }
                row[header] = val;
            });
            data.push(row);
        }
        return data;
    }

    // Parse a single CSV line handling quoted fields
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current);
        return result;
    }

    // ─── File Handlers ───

    // Attach drag-drop listeners after view renders
    setTimeout(function() {
        setupDropZone('subjectDropZone', 'subjectFileInput', function(file) {
            $scope.$apply(function() { $scope.onSubjectFileSelect(file); });
        });
        setupDropZone('timetableDropZone', 'timetableFileInput', function(file) {
            $scope.$apply(function() { $scope.onTimetableFileSelect(file); });
        });
        setupDropZone('classroomDropZone', 'classroomFileInput', function(file) {
            $scope.$apply(function() { $scope.onClassroomFileSelect(file); });
        });
    }, 100);

    function setupDropZone(zoneId, inputId, callback) {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);
        if (!zone || !input) return;

        zone.addEventListener('click', function() { input.click(); });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.classList.remove('drop-zone-hover');
            if (e.dataTransfer.files.length > 0) {
                callback(e.dataTransfer.files[0]);
            }
        });
    }

    $scope.onSubjectFileSelect = function(file) {
        if (!file) return;
        $scope.subjectFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            $scope.$apply(function() {
                const raw = parseCSV(e.target.result);
                // Map to expected format
                $scope.subjectData = raw.map(function(row) {
                    return {
                        code: row.code || row.subject_code || '',
                        name: row.name || row.subject_name || '',
                        faculty: row.faculty || '',
                        total_required_classes: parseInt(row.total_required_classes || row.total_hours || 30),
                        completed_classes: parseInt(row.completed_classes || 0),
                        color_code: row.color_code || '#3498db'
                    };
                }).filter(function(s) { return s.code; });
            });
        };
        reader.readAsText(file);
    };

    $scope.onTimetableFileSelect = function(file) {
        if (!file) return;
        $scope.timetableFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            $scope.$apply(function() {
                const raw = parseCSV(e.target.result);
                $scope.timetableData = raw.map(function(row) {
                    return {
                        day: row.day || '',
                        period_no: parseInt(row.period_no || 1),
                        time_from: row.time_from || '',
                        time_to: row.time_to || '',
                        subject_code: row.subject_code || null,
                        room_name: row.room_name || null,
                        batch: row.batch || 'ALL',
                        is_lab: parseInt(row.is_lab || 0),
                        notes: row.notes || ''
                    };
                }).filter(function(t) { return t.day; });
            });
        };
        reader.readAsText(file);
    };

    $scope.onClassroomFileSelect = function(file) {
        if (!file) return;
        $scope.classroomFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            $scope.$apply(function() {
                const raw = parseCSV(e.target.result);
                $scope.classroomData = raw.map(function(row) {
                    return {
                        room_name: row.room_name || '',
                        floor: row.floor || 'Unknown',
                        capacity: parseInt(row.capacity || 60)
                    };
                }).filter(function(c) { return c.room_name; });
            });
        };
        reader.readAsText(file);
    };

    // ─── Clear Functions ───
    $scope.clearSubjects = function() {
        $scope.subjectFile = null;
        $scope.subjectData = [];
        var input = document.getElementById('subjectFileInput');
        if (input) input.value = '';
    };

    $scope.clearTimetable = function() {
        $scope.timetableFile = null;
        $scope.timetableData = [];
        var input = document.getElementById('timetableFileInput');
        if (input) input.value = '';
    };

    $scope.clearClassrooms = function() {
        $scope.classroomFile = null;
        $scope.classroomData = [];
        var input = document.getElementById('classroomFileInput');
        if (input) input.value = '';
    };

    // ─── Upload Functions ───
    $scope.uploadTimetable = function() {
        if ($scope.subjectData.length === 0 || $scope.timetableData.length === 0) {
            showToast('Please upload both Subjects and Timetable CSVs first!', 'error');
            return;
        }

        if (!confirm('This will REPLACE all your existing timetable & subject data. Are you sure?')) return;

        $scope.uploading = true;
        apiService.post('/upload/timetable', {
            subjects: $scope.subjectData,
            timetable: $scope.timetableData
        }).then(function(res) {
            $scope.uploading = false;
            showToast(res.data.message, 'success');
            $scope.clearSubjects();
            $scope.clearTimetable();
        }, function(err) {
            $scope.uploading = false;
            showToast('Upload failed: ' + (err.data ? err.data.error : err.statusText), 'error');
        });
    };

    $scope.uploadClassrooms = function() {
        if ($scope.classroomData.length === 0) {
            showToast('Please upload a Classrooms CSV first!', 'error');
            return;
        }

        if (!confirm('Upload ' + $scope.classroomData.length + ' classrooms to the database?')) return;

        $scope.uploading = true;
        apiService.post('/upload/classrooms', {
            classrooms: $scope.classroomData
        }).then(function(res) {
            $scope.uploading = false;
            showToast(res.data.message, 'success');
            $scope.clearClassrooms();
        }, function(err) {
            $scope.uploading = false;
            showToast('Upload failed: ' + (err.data ? err.data.error : err.statusText), 'error');
        });
    };

    // ─── Template Downloads ───
    $scope.downloadTemplate = function(type) {
        let csv = '';
        let filename = '';

        if (type === 'subjects') {
            csv = 'code,name,faculty,total_required_classes,completed_classes,color_code\n';
            csv += 'DBMS_T,"Database Management System (T)","Prof. Example",30,0,#9b59b6\n';
            csv += 'DBMS_P1,"Database Management System (A1)","Prof. Example",30,0,#9b59b6\n';
            csv += 'WP_T,"Web Programming (T)","Prof. Example",30,0,#2ecc71\n';
            filename = 'subjects_template.csv';
        } else if (type === 'timetable') {
            csv = 'day,period_no,time_from,time_to,subject_code,room_name,batch,is_lab\n';
            csv += 'Monday,1,09:15,10:15,DBMS_T,L-15,ALL,0\n';
            csv += 'Monday,2,10:15,11:15,DBMS_P1,LAB-1,A1,1\n';
            csv += 'Monday,2,10:15,11:15,WP_P2,LAB-3,A2,1\n';
            filename = 'timetable_template.csv';
        } else if (type === 'classrooms') {
            csv = 'room_name,floor,capacity\n';
            csv += 'L-01,3rd,60\n';
            csv += 'LAB-1,2nd,30\n';
            csv += 'S-01,Ground,150\n';
            filename = 'classrooms_template.csv';
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };
}]);
