import faiss
import numpy as np

embeddings = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [0.7, 0.8, 0.9]]).astype('float32')

dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(embeddings)

print("Total vectors stored", index.ntotal)

query = np.array([[0.1, 0.2, 0.3]]).astype('float32')
k = 2
distances, indices = index.search(query, k)
	
print("Nearest documents:", indices)