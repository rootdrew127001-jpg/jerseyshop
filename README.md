# Modelyx – AI-Powered Jersey Design Platform

## 🚀 Quick Start with Docker (Recommended)

You only need **Docker Desktop** installed on your machine. You do not need to install Python, MySQL, or Redis locally.

### 1. Clone the Repository
```bash
git clone <repository_url>
cd jerseyshop
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
# On Linux/macOS:
cp .env.example .env

# On Windows (PowerShell):
copy .env.example .env
```
*(Optional)* Add your Claude/Gemini API keys, PayPal credentials, or Google OAuth keys in `.env` if you plan to use those features.

### 3. Start the Application
```bash
docker compose up --build
```
> To run in the background (detached mode), use: `docker compose up -d --build`

### 4. Access the Application
- 🌐 **Web Platform:** [http://localhost:9100](http://localhost:9100)
- 📖 **Interactive API Docs (Swagger):** [http://localhost:9100/docs](http://localhost:9100/docs)
- 🗄️ **MySQL Database:** Accessible on `localhost:3307` (user: `root`, password: `admin123`, db: `jersey`)
- ⚡ **Redis Cache:** Accessible on `localhost:6379`

---

## 🛠️ Useful Docker Commands

- **View Live Logs:**
  ```bash
  docker compose logs -f app
  ```
- **Stop Containers:**
  ```bash
  docker compose down
  ```
- **Wipe Database & Reset from Scratch:**
  ```bash
  docker compose down -v
  docker compose up --build
  ```
- **Access Database Shell:**
  ```bash
  docker compose exec db mysql -u root -padmin123 jersey
  ```
- **Access App Container Shell:**
  ```bash
  docker compose exec app bash
  ```

---

## 💻 Alternative: Manual Local Setup (Without Docker)

If you prefer running without Docker:
1. Create a Python virtual environment: `python -m venv venv`
2. Activate environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Ensure local MySQL & Redis servers are running.
5. Create database: `CREATE DATABASE jersey;`
6. Set `DB_HOST=localhost` in `.env`.
7. Start server: `uvicorn app.main:app --port 9100 --reload`