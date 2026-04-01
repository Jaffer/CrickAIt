import warnings
import faiss
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer

warnings.filterwarnings(
    "ignore",
    message="resource_tracker: There appear to be .* leaked semaphore objects to clean up at shutdown",
)

# Load embedding model
print("Loading embedding model...")

model = SentenceTransformer("all-MiniLM-L6-v2")


# Load FAISS index
print("Loading FAISS index...")

index = faiss.read_index("vector_db/cricket_index.faiss")


# Load documents
print("Loading documents...")

with open("vector_db/documents.pkl", "rb") as f:
    documents = pickle.load(f)


print("Total documents loaded:", len(documents))


# Search function
def search(query, k=3):

    print("\nUser query:", query)

    # Convert query to embedding
    query_embedding = model.encode(
        [query],
        show_progress_bar=False,
        device="cpu",
        batch_size=1,
        convert_to_numpy=True,
        normalize_embeddings=False,
    )

    query_embedding = np.array(query_embedding).astype("float32")

    # Search FAISS index
    distances, indices = index.search(query_embedding, k)

    results = []

    for i in indices[0]:
        results.append(documents[i])

    return results


# Test the retriever
query = "Where was Malawi vs Ghana played?"

results = search(query)

print("\nTop retrieved documents:\n")

for r in results:
    print("----------------------")
    print(r)