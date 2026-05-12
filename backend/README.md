# 🏢 Hot Desk Reservation System - Database Setup

This project contains the complete database architecture for an office hot-desking system. The database environment is fully containerized using Docker, and the table structure and relationships are managed via Python scripts using SQLAlchemy Core (raw SQL, no ORM).

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:
* **Docker** and **Docker Compose**
* **Python 3.x**

---

## 🚀 Quick Start (Step-by-step guide)

# 1. Run the containers (Database + pgAdmin)
The PostgreSQL database and pgAdmin management panel are configured and connected within an internal Docker network. To start them, open a terminal in the project's root directory and run:

```bash
docker compose up -d
```
---
# 2. Python Environment Setup

The scripts that build the database require specific libraries. Run the following commands to create an isolated virtual environment and install the dependencies:
```bash

### 1. Create a virtual environment
python3 -m venv .venv

### 2. Activate the environment (for Linux/macOS)
source .venv/bin/activate

### 3. Install the required packages
pip install -r requirements.txt
```

---
# 3. Environment Variables Setup

The project uses a `.env` file to manage database connections. We provide an example file to help you get started quickly.

1. Copy the example file to create your local environment file:
```bash
cp .env.example .env
```
2. Open the `.env` file and make sure the parameters match your Docker database settings.

---
# 4. Initialize the Database Structure (Schema)

Once the containers are running, your `.env` is set, and your Python environment is active, execute the main script to initialize the database structure:
```bash
python database.py
```

# 5. Run the FastAPI Server

To start the API application, run the development server using uvicorn:
```bash
uvicorn main:app --reload 
```
You can access the interactive documentation (Swagger) at: http://127.0.0.1:8000/docs
