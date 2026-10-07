from backend.app.main import app

# This file acts as a proxy for Render which runs `uvicorn main:app`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=10000)
