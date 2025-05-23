# Local Setup and Deployment Guide

This guide explains how to set up and run the Fusion SQL PWA application locally for development and testing, and provides conceptual guidance for deployment.

## 1. Prerequisites

*   **Node.js:** Version >= 18.x recommended. Download from [nodejs.org](https://nodejs.org/).
*   **npm/yarn:** npm is included with Node.js. Yarn can be installed separately if preferred.
*   **PostgreSQL:** Version >= 13.x recommended. Download from [postgresql.org](https://www.postgresql.org/download/).
*   **Git:** For cloning the repository. Download from [git-scm.com](https://git-scm.com/downloads).
*   **Oracle Fusion HCM Instance:** Access to an Oracle Fusion HCM instance with BI Publisher configured. You'll need a user with permissions to create/run reports and data models in a specific BI Publisher catalog folder (e.g., `/Custom/YourAppFolder/`).

## 2. Backend Setup (Node.js/Express.js)

The backend server handles user authentication, connection management, and interacts with the Oracle Fusion BI Publisher services.

1.  **Clone the Repository:**
    If you haven't already, clone the repository containing the application code.
    ```bash
    git clone <repository_url>
    cd <repository_folder>/pwa-backend  # Adjust path if backend is in a different subfolder
    ```

2.  **Install Dependencies:**
    Navigate to the backend directory and install the required Node.js packages.
    ```bash
    npm install
    # or, if you prefer yarn:
    # yarn install
    ```

3.  **PostgreSQL Database Setup:**
    *   Ensure your PostgreSQL server is running.
    *   Connect to PostgreSQL using `psql` or a GUI tool (like pgAdmin).
    *   Create a dedicated database and user for the application. Replace `'your_strong_password'` with a secure password.
        Example SQL commands:
        ```sql
        CREATE DATABASE fusionsql_pwa_db;
        CREATE USER fusionsql_pwa_user WITH ENCRYPTED PASSWORD 'your_strong_password';
        GRANT ALL PRIVILEGES ON DATABASE fusionsql_pwa_db TO fusionsql_pwa_user;
        ```
    *   **Important:** Note down the database name (`fusionsql_pwa_db`), username (`fusionsql_pwa_user`), and your chosen password.

4.  **Run Database Schema Migrations:**
    *   The database schema (tables `users` and `connections`) needs to be created. The SQL script for this is `schema.sql`.
    *   Execute this script against your newly created database.
        If `schema.sql` is in the root of the backend directory:
        ```bash
        psql -U fusionsql_pwa_user -d fusionsql_pwa_db -a -f schema.sql
        ```
        You will be prompted for the password of `fusionsql_pwa_user`.

5.  **Environment Variable Configuration:**
    *   The backend requires environment variables for database credentials, JWT secrets, and encryption keys.
    *   In the backend directory, copy the example environment file `.env.example` to a new file named `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Open the `.env` file and update it with your settings:
        ```dotenv
        DB_USER=fusionsql_pwa_user
        DB_HOST=localhost
        DB_DATABASE=fusionsql_pwa_db
        DB_PASSWORD=your_strong_password # The password you set in step 3
        DB_PORT=5432

        JWT_SECRET=your_very_strong_and_random_jwt_secret_key_at_least_32_characters
        ENCRYPTION_KEY=a_32_byte_random_hex_string_for_aes_256_encryption_key # e.g., 64 hex characters

        PORT=3000 # Port for the backend server to run on

        # Optional: If BI Publisher base folder is configurable (check fusionSqlService.js)
        # BI_PUBLISHER_BASE_FOLDER=/Custom/YourAppFolder/FusionSQLTool
        ```
    *   **Security Note:** The `.env` file contains sensitive credentials and should **never** be committed to Git. Ensure `.env` is listed in your `.gitignore` file.

6.  **Running the Backend Server:**
    Start the backend server using the script defined in `package.json`.
    ```bash
    npm start 
    # Or, if you have a development script (e.g., using nodemon):
    # npm run dev
    ```
    *   The server should now be running (typically on port `3000` as configured in `.env`). Check the console output for messages indicating the server has started and is connected to the database.

## 3. Frontend Setup (React/Vite)

The frontend is a React application built with Vite, providing the user interface for the PWA.

1.  **Navigate to Frontend Directory:**
    Open a new terminal window or tab, and navigate to the frontend directory.
    ```bash
    cd <repository_folder>/pwa-frontend # Adjust path if frontend is in a different subfolder
    ```

2.  **Install Dependencies:**
    Install the required Node.js packages for the frontend.
    ```bash
    npm install
    # or, if you prefer yarn:
    # yarn install
    ```

3.  **Environment Variable Configuration:**
    *   The frontend needs to know the URL of the backend API.
    *   In the frontend directory, copy the example environment file `.env.example` to a new file named `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Open the `.env` file and set the `VITE_API_BASE_URL` to point to your running backend server.
        ```dotenv
        VITE_API_BASE_URL=http://localhost:3000/api # Matches default backend PORT and /api prefix
        ```
        If your backend is running on a different port, adjust this URL accordingly.

4.  **Running the Frontend Development Server:**
    Start the Vite development server.
    ```bash
    npm run dev
    ```
    *   The frontend development server will typically start on a port like `3001` or `5173` (Vite's default).
    *   Open the URL shown in the console (e.g., `http://localhost:3001`) in your web browser to access the PWA.

## 4. Deployment Strategies (Conceptual)

Deploying this application involves two main components: the Node.js backend and the React frontend. They can be deployed independently or together.

### 4.1. Backend Deployment

The backend Node.js application needs a Node.js runtime environment and access to a PostgreSQL database.

*   **Build (if applicable):** If your backend uses TypeScript or has other build steps, run the build command (e.g., `npm run build`) before deployment.
*   **Environment Variables:** Crucially, all environment variables defined in your local `.env` file (database connection strings, JWT secrets, encryption keys, etc.) must be securely configured on the deployment server or service. **Do not commit `.env` files containing production secrets to your repository.** Use the environment variable management system provided by your chosen deployment platform.
*   **Deployment Options:**
    *   **Platform as a Service (PaaS):**
        *   **Examples:** Heroku, Render, Fly.io, AWS Elastic Beanstalk, Google App Engine.
        *   **Process:** Typically involves connecting your Git repository to the PaaS, configuring environment variables through their dashboard or CLI, and letting the PaaS handle server provisioning, code deployment, and often scaling.
        *   **Database:** Most PaaS providers offer managed PostgreSQL database services (e.g., Heroku Postgres, AWS RDS via Elastic Beanstalk).
    *   **Containers (Docker):**
        *   **Process:**
            1.  Create a `Dockerfile` for your backend application. This file defines the steps to build a Docker image containing your application and its dependencies.
            2.  Build the Docker image.
            3.  Push the image to a container registry (e.g., Docker Hub, AWS ECR, Google Artifact Registry, GitHub Container Registry).
            4.  Run the container on a cloud provider's container service (e.g., AWS ECS, Google Cloud Run, Azure Container Instances) or a Kubernetes cluster.
        *   **Database:** You'll need a separate managed PostgreSQL instance or run PostgreSQL in its own container (ensure data persistence is handled correctly).
    *   **Virtual Private Server (VPS) / Bare Metal:**
        *   **Examples:** AWS EC2, DigitalOcean Droplets, Linode.
        *   **Process:** You provision a server and are responsible for all setup:
            1.  Install Node.js, PostgreSQL (or connect to a remote/managed one).
            2.  Deploy your code (e.g., using Git pull).
            3.  Install dependencies (`npm install --production`).
            4.  Set up a process manager (like PM2 or systemd) to keep your Node.js application running.
            5.  Configure a reverse proxy (like Nginx or Apache) to handle incoming HTTP/S requests, forward them to your Node.js application, and manage SSL/TLS certificates (e.g., using Let's Encrypt).

### 4.2. Frontend Deployment

The React frontend, after being built, consists of static HTML, CSS, and JavaScript files.

*   **Build for Production:**
    Navigate to your frontend directory and run the build script:
    ```bash
    npm run build
    ```
    This command (from Vite) will typically create a `dist` folder (or `build` for Create React App) containing the optimized static assets.

*   **Deployment Options:**
    *   **Static Hosting Platforms:**
        *   **Examples:** Netlify, Vercel, GitHub Pages (for public projects), AWS S3 (configured for static website hosting) + CloudFront (for CDN and SSL), Firebase Hosting, Cloudflare Pages.
        *   **Process:** These platforms are specifically designed for hosting static websites. Deployment is often as simple as connecting your Git repository (they can build from source) or uploading the contents of your build directory (`dist`).
        *   **Benefits:** They usually handle CDN distribution, SSL certificates, and custom domains automatically.
    *   **Serve from Backend Server (Less Common for SPAs):**
        *   While possible, it's generally recommended to use dedicated static hosting for performance and separation of concerns.
        *   If you choose this route, configure your backend's reverse proxy (Nginx/Apache) to serve the static files from the frontend's build directory for specific routes, while API calls go to the backend.

### 4.3. Important Considerations for Production

*   **Database:** Always use a managed PostgreSQL service in production (e.g., AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL). These services provide reliability, automated backups, scaling, and maintenance.
*   **SSL/TLS Certificates:** Ensure HTTPS is enforced for both frontend and backend to protect data in transit. Most PaaS and static hosting platforms provide free SSL certificates and manage their renewal. For VPS setups, use tools like Let's Encrypt.
*   **CORS (Cross-Origin Resource Sharing):** If your frontend and backend are served from different domains (e.g., `app.yourdomain.com` for frontend, `api.yourdomain.com` for backend), configure CORS on your backend server to allow requests from your frontend's domain. The `cors` npm package is commonly used in Express.js for this.
*   **Security:**
    *   Regularly update all dependencies (both frontend and backend) to patch security vulnerabilities.
    *   Protect against common web vulnerabilities (XSS, CSRF, SQL Injection - though your SQL is passed to BI Publisher, ensure any direct DB interactions are secure).
    *   Implement robust security headers (e.g., Content Security Policy, HSTS).
    *   Securely manage all secrets and API keys.
*   **Logging and Monitoring:** Implement logging (e.g., Winston or Pino for Node.js) and monitoring tools (e.g., Sentry, Datadog, Prometheus/Grafana) to track application health and errors in production.
*   **Backup Strategy:** Ensure your database has a regular backup strategy, especially if not using a managed database service that handles this automatically.
*   **PWA Service Worker & HTTPS:** For the PWA service worker to register and for features like "Add to Home Screen" to work reliably, the frontend must be served over HTTPS.
```
