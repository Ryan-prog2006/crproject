// API Service
app.service('apiService', ['$http', '$window', function($http, $window) {
    const baseUrl = '/api';

    // Helper to get headers
    const getHeaders = () => {
        const token = $window.localStorage.getItem('token');
        return token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    };

    this.get = function(endpoint) {
        return $http.get(`${baseUrl}${endpoint}`, getHeaders());
    };

    this.post = function(endpoint, data) {
        return $http.post(`${baseUrl}${endpoint}`, data, getHeaders());
    };

    this.put = function(endpoint, data) {
        return $http.put(`${baseUrl}${endpoint}`, data, getHeaders());
    };

    this.delete = function(endpoint) {
        return $http.delete(`${baseUrl}${endpoint}`, getHeaders());
    };

    this.login = function(username, password) {
        return $http.post(`${baseUrl}/auth/login`, { username, password });
    };
}]);
