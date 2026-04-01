import os
import json
import pickle
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


# Load embedding model
print("Loading embedding model...")

model = SentenceTransformer("all-MiniLM-L6-v2")

# Dataset path
dataset_path = "data/cricsheet_raw/all_json"

files = os.listdir(dataset_path)

print("Total files found:", len(files))

# Create documents
documents = []

print("Creating context-rich documents...")

count = 0

for file in files:

    if file.endswith(".json"):

        file_path = os.path.join(dataset_path, file)

        with open(file_path, "r") as f:
            data = json.load(f)

        info = data["info"]

        teams = info["teams"]
        venue = info["venue"]
        date = info["dates"][0]

        team1 = teams[0]
        team2 = teams[1]

        # Create context-rich document
        document = f"""
Cricket Match Information

Teams: {team1} vs {team2}
Venue: {venue}
Date: {date}

Summary:
{team1} played against {team2} at {venue} on {date}.
"""

        documents.append(document.strip())

        count += 1


print("Total documents created:", len(documents))


# Print sample document for verification
print("\nExample document:\n")
print(documents[0])


# Create embeddings
print("\nCreating embeddings...")

embeddings = model.encode(
    documents,
    show_progress_bar=True,
    device="cpu",
    batch_size=64,
    convert_to_numpy=True,
    normalize_embeddings=False,
)

embeddings = np.array(embeddings).astype("float32")

print("Embeddings created:", embeddings.shape)


# Build FAISS index
dimension = embeddings.shape[1]

print("Embedding dimension:", dimension)

print("Building FAISS index...")

index = faiss.IndexFlatL2(dimension)

index.add(embeddings)

print("Total vectors stored in FAISS:", index.ntotal)


# Save vector database
print("\nSaving vector store...")

# Create folder if not exists
os.makedirs("vector_db", exist_ok=True)

# Save FAISS index
faiss.write_index(index, "vector_db/cricket_index.faiss")

# Save documents
with open("vector_db/documents.pkl", "wb") as f:
    pickle.dump(documents, f)

print("Vector store saved successfully!")


print("\nRAG vector store build complete.")