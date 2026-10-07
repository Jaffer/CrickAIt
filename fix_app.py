with open('backend/app/main.py', 'r') as f:
    content = f.read()

app_def = """

app = FastAPI(
    title="CrickAIt Backend API",
    description="Backend for the CrickAIt AI Application",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""

content = content.replace("    await DatabaseProvider.close()\n\n\n", "    await DatabaseProvider.close()\n\n" + app_def + "\n")

with open('backend/app/main.py', 'w') as f:
    f.write(content)
