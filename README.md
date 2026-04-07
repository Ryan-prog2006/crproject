# Smart Classroom Management and Scheduling System
Built for NMIMS Jadcherla.

## 🚀 Setup Instructions

### 1. Database Setup (MySQL)
1.  Open **XAMPP Control Panel** and start **Apache** and **MySQL**.
2.  Go to [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
3.  Create a new database named `smart_classroom`.
4.  Import the file `database/smart_classroom.sql` into this database.

### 2. Backend Setup (Node.js)
1.  Open a terminal and navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the server:
    ```bash
    npm start
    ```
    *The server will run on [http://localhost:3000](http://localhost:3000)*.
    *On first run, it will automatically backfill attendance logs from January 2nd, 2026.*

### 3. Frontend Setup
1.  Open `frontend/index.html` in any modern web browser.
2.  Login using the credentials below.

---

## 🔑 Login Credentials

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Class Rep (CR)** | `cr` | `cr123` |
| **Student** | `student` | `student123` |

---

## ✨ Features
- **Real-time Classrooms**: 43 visual grid cards with filtering and status management.
- **Weekly Timetable**: Fully interactive weekly grid with subject code badges.
- **Progress Tracking**: Circular progress indicators and automated completion stats.
- **Role-based Access**: Admin/CR can edit schedules and mark attendance; Students have view-only access.
- **Attendance Backfill**: Automatically calculates past attendance based on the provided 2026 timetable.

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JS, AngularJS 1.8.x
- **Backend**: Node.js, Express.js
- **Database**: MySQL (mysql2)
- **Design**: Pure CSS (No Bootstrap)
