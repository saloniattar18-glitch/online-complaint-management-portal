# Online Complaint Management Portal

The **Online Complaint Management Portal** is a web-based college project designed to provide a centralized system for submitting, assigning, tracking and resolving complaints.

The system contains three major roles:

- User
- Staff
- Administrator

---

## 1. Main Features

### User Module

Users can:

- Register an account
- Login securely
- View dashboard statistics
- Submit complaints
- Select complaint categories
- Select complaint priority
- Enter complaint location
- Upload complaint images
- View submitted complaints
- View complaint details
- Track complaint status history
- Update profile information
- Submit feedback
- Logout

---

### Staff Module

Staff members can:

- Login securely
- View dashboard statistics
- View assigned complaints
- Search assigned complaints
- Filter complaints by status
- Filter complaints by priority
- View complaint details
- Update complaint status
- Add complaint remarks
- View complaint status history
- Update profile
- Logout

---

### Admin Module

Administrators can:

- Login securely
- View system dashboard
- View all complaints
- Filter and search complaints
- View complaint details
- Assign complaints to departments
- Assign complaints to staff
- Update complaint status
- Manage categories
- Manage departments
- Create staff accounts
- View users
- View individual user details
- View reports
- View contact messages
- Update administrator profile
- Logout

---

## 2. Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Font Awesome

### Backend

- Node.js
- Vercel Serverless Functions
- JavaScript

### Database

- PostgreSQL
- Neon PostgreSQL

### Authentication

- JSON Web Token (JWT)
- bcryptjs password hashing

### Deployment

- Vercel

---

## 3. Project Structure

```text
online-complaint-management-portal/
│
├── admin/
│   ├── login.html
│   ├── dashboard.html
│   ├── complaints.html
│   ├── complaint-details.html
│   ├── users.html
│   ├── user-details.html
│   ├── categories.html
│   ├── departments.html
│   ├── staff.html
│   ├── reports.html
│   ├── messages.html
│   └── profile.html
│
├── user/
│   ├── register.html
│   ├── login.html
│   ├── dashboard.html
│   ├── profile.html
│   ├── submit-complaint.html
│   ├── complaints.html
│   ├── complaint-details.html
│   ├── complaint-status.html
│   └── feedback.html
│
├── staff/
│   ├── login.html
│   ├── dashboard.html
│   ├── assigned-complaints.html
│   ├── complaint-details.html
│   └── profile.html
│
├── api/
│   └── index.js
│
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   ├── user.css
│   │   ├── staff.css
│   │   └── admin.css
│   │
│   ├── images/
│   │   ├── logo.png
│   │   ├── complaint-placeholder.svg
│   │   ├── banner.jpg
│   │   └── uploads/
│   │
│   └── js/
│       ├── common.js
│       ├── auth.js
│       ├── public.js
│       ├── user.js
│       ├── staff.js
│       └── admin.js
│
├── lib/
│   ├── db.js
│   ├── auth.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── complaintController.js
│   │   ├── categoryController.js
│   │   ├── departmentController.js
│   │   ├── staffController.js
│   │   ├── feedbackController.js
│   │   ├── profileController.js
│   │   ├── contactController.js
│   │   └── adminController.js
│   │
│   └── helpers/
│       ├── response.js
│       ├── validation.js
│       └── router.js
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── scripts/
│   └── create-admin.js
│
├── index.html
├── about.html
├── how-it-works.html
├── contact.html
├── 404.html
├── package.json
├── vercel.json
├── README.md
├── .gitignore
└── .env.example
```

ONLINE COMPLAINT MANAGEMENT PORTAL
TERMINAL COMMANDS - START TO DEPLOY
Windows PowerShell + VS Code + Neon PostgreSQL + Vercel

============================================================

1. # OPEN POWERSHELL AND GO TO THE PROJECT

If your project is on Desktop:

cd "$HOME\Desktop\online-complaint-management-portal"

Or replace the path with your actual project location:

cd "C:\path\to\online-complaint-management-portal"

Check project files:

dir

You should see folders/files such as:

admin
user
staff
api
assets
lib
database
scripts
package.json
vercel.json
index.html

============================================================ 2. CHECK NODE.JS AND NPM
============================================================

node -v

npm -v

============================================================ 3. INSTALL PROJECT PACKAGES
============================================================

npm install

Verify important packages:

npm list pg bcryptjs jsonwebtoken formidable dotenv

============================================================ 4. CREATE THE .env FILE
============================================================

Copy the example file:

Copy-Item .env.example .env

Open it:

notepad .env

Add/update these values inside .env:

DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@YOUR_NEON_HOST/YOUR_DATABASE?sslmode=require

JWT_SECRET=complaint_portal_super_secret_key_2026_change_this
JWT_EXPIRES_IN=7d

NODE_ENV=development

APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

DB_POOL_MAX=5
DB_CONNECTION_TIMEOUT=10000
DB_IDLE_TIMEOUT=10000

ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@complaintportal.com
ADMIN_PASSWORD=Admin@123
ADMIN_USERNAME=admin
ADMIN_MOBILE=9999999999
ADMIN_ADDRESS=Complaint Portal Administration

Save and close Notepad.

============================================================ 5. CREATE DATABASE TABLES ON NEON
============================================================

Recommended method:

1. Open Neon Console.
2. Open your Neon project.
3. Open SQL Editor.
4. Copy and run the complete contents of:

database/schema.sql

5. After schema.sql finishes successfully, copy and run:

database/seed.sql

---

## OPTIONAL: RUN SQL FROM POWERSHELL IF psql IS INSTALLED

Temporarily set your Neon URL:

$env:DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@YOUR_NEON_HOST/YOUR_DATABASE?sslmode=require"

Run the schema:

psql $env:DATABASE_URL -f database/schema.sql

Run seed data:

psql $env:DATABASE_URL -f database/seed.sql

If PowerShell says "psql is not recognized", use the Neon SQL Editor instead.

============================================================ 6. CREATE / UPDATE ADMIN ACCOUNT
============================================================

Using npm:

npm run create-admin

OR:

node scripts/create-admin.js

Expected admin login:

Email:
admin@complaintportal.com

Password:
Admin@123

============================================================ 7. CHECK / INSTALL VERCEL CLI
============================================================

Check:

vercel --version

If it is not installed:

npm install -g vercel

Check again:

vercel --version

============================================================ 8. LOGIN TO VERCEL
============================================================

vercel login

============================================================ 9. LINK THE PROJECT TO VERCEL
============================================================

vercel link

If creating a new Vercel project, use a name such as:

online-complaint-management-portal

============================================================ 10. RUN PROJECT LOCALLY
============================================================

Preferred:

npm run dev

OR:

vercel dev

Typical local URL:

http://localhost:3000

Keep this terminal running while testing.

============================================================ 11. OPEN IMPORTANT LOCAL PAGES
============================================================

Home:

http://localhost:3000

User Registration:

http://localhost:3000/user/register.html

User Login:

http://localhost:3000/user/login.html

Staff Login:

http://localhost:3000/staff/login.html

Admin Login:

http://localhost:3000/admin/login.html

============================================================ 12. TEST API IN A SECOND POWERSHELL TERMINAL
============================================================

Leave "npm run dev" or "vercel dev" running.

Open another PowerShell terminal.

Test health endpoint:

Invoke-RestMethod http://localhost:3000/api/health

Test main API:

Invoke-RestMethod http://localhost:3000/api/

============================================================ 13. TEST ADMIN LOGIN FROM POWERSHELL
============================================================

$body = @{
email = "admin@complaintportal.com"
password = "Admin@123"
role = "admin"
} | ConvertTo-Json

Invoke-RestMethod `    -Uri "http://localhost:3000/api/auth/login"`
-Method Post `    -ContentType "application/json"`
-Body $body

============================================================ 14. TEST DEMO USER LOGIN
============================================================

$body = @{
email = "user@complaintportal.com"
password = "User@123"
role = "user"
} | ConvertTo-Json

Invoke-RestMethod `    -Uri "http://localhost:3000/api/auth/login"`
-Method Post `    -ContentType "application/json"`
-Body $body

============================================================ 15. TEST STAFF LOGIN
============================================================

$body = @{
email = "water.staff@complaintportal.com"
password = "Staff@123"
role = "staff"
} | ConvertTo-Json

Invoke-RestMethod `    -Uri "http://localhost:3000/api/auth/login"`
-Method Post `    -ContentType "application/json"`
-Body $body

============================================================ 16. STOP LOCAL SERVER WHEN FINISHED TESTING
============================================================

Press:

Ctrl + C

============================================================ 17. INITIALIZE GIT
============================================================

git init

git add .

Check what will be committed:

git status

IMPORTANT:
Make sure .env is NOT listed for commit.

Create commit:

git commit -m "Initial Online Complaint Management Portal"

Set main branch:

git branch -M main

============================================================ 18. CONNECT GITHUB REPOSITORY
============================================================

Replace YOUR_USERNAME with your GitHub username:

git remote add origin https://github.com/YOUR_USERNAME/online-complaint-management-portal.git

Push:

git push -u origin main

============================================================ 19. ADD ENVIRONMENT VARIABLES TO VERCEL
============================================================

Add Neon PostgreSQL URL:

vercel env add DATABASE_URL

Paste your Neon pooled connection string when asked.

Add JWT secret:

vercel env add JWT_SECRET

Add JWT expiry:

vercel env add JWT_EXPIRES_IN

Enter:

7d

Add production mode:

vercel env add NODE_ENV

Enter:

production

Check configured environment variables:

vercel env ls

============================================================ 20. OPTIONAL VERCEL ENVIRONMENT VARIABLES
============================================================

You can also add:

vercel env add APP_URL

vercel env add FRONTEND_URL

vercel env add DB_POOL_MAX

vercel env add DB_CONNECTION_TIMEOUT

vercel env add DB_IDLE_TIMEOUT

For production APP_URL and FRONTEND_URL, use your final Vercel URL after deployment if required.

============================================================ 21. PREVIEW DEPLOYMENT
============================================================

vercel

============================================================ 22. PRODUCTION DEPLOYMENT
============================================================

vercel --prod

Vercel will return a website address similar to:

https://online-complaint-management-portal.vercel.app

============================================================ 23. AFTER FUTURE CODE CHANGES
============================================================

Whenever you change project code:

git add .

git commit -m "Update project"

git push

If GitHub is connected to Vercel, Vercel can automatically redeploy.

Or deploy manually:

vercel --prod

============================================================ 24. USEFUL DEVELOPMENT COMMANDS
============================================================

Install all dependencies:

npm install

Run project:

npm run dev

Create/update admin:

npm run create-admin

Check Node:

node -v

Check npm:

npm -v

Check Vercel:

vercel --version

Check Git:

git --version

Check Git status:

git status

Show Git remotes:

git remote -v

Show installed packages:

npm list --depth=0

============================================================ 25. MAIN COMMAND ORDER - SHORT VERSION
============================================================

cd "$HOME\Desktop\online-complaint-management-portal"

node -v

npm -v

npm install

Copy-Item .env.example .env

notepad .env

Then in Neon SQL Editor:

1. Run database/schema.sql
2. Run database/seed.sql

Then return to PowerShell:

npm run create-admin

vercel --version

npm install -g vercel

vercel login

vercel link

npm run dev

After local testing succeeds:

git init

git add .

git status

git commit -m "Initial Online Complaint Management Portal"

git branch -M main

git remote add origin https://github.com/YOUR_USERNAME/online-complaint-management-portal.git

git push -u origin main

Configure Vercel:

vercel env add DATABASE_URL

vercel env add JWT_SECRET

vercel env add JWT_EXPIRES_IN

vercel env add NODE_ENV

vercel env ls

Deploy:

vercel --prod

============================================================
IMPORTANT NOTES
============================================================

1. This project uses PostgreSQL hosted on Neon.

2. Do NOT install or use mysql2 for this project.

3. Keep your real .env file private.

4. Never upload DATABASE_URL, JWT_SECRET, or database passwords to GitHub.

5. Run database/schema.sql before database/seed.sql.

6. Run npm run create-admin only after the users table exists.

7. Use the Neon pooled PostgreSQL connection string for the Vercel application when available.

8. Keep the local server running while testing browser pages or API endpoints.

9. Replace placeholder values such as:
   YOUR_USERNAME
   YOUR_PASSWORD
   YOUR_NEON_HOST
   YOUR_DATABASE
   YOUR_GITHUB_USERNAME
   with your real values.

============================================================
END
============================================================
#   o n l i n e - c o m p l a i n t - m a n a g e m e n t - p o r t a l  
 