from sentence_transformers import SentenceTransformer
import json
import os

model = SentenceTransformer('all-MiniLM-L6-v2')
Dataset_Path = "data/cricsheet_raw/all_json"
files = os.listdir(Dataset_Path)

documents = []
count = 0

for file in files:
	if file.endswith(".json"):
		file_path = os.path.join(Dataset_Path, file)
		print("Reading file: ", file_path)

		with open(file_path, 'r') as f:
			data = json.load(f)
		
		info = data["info"]
		teams = info["teams"]
		venue = info["venue"]
		dates = info["dates"][0]

		sentence = f"Match between {teams[0]} and {teams[1]} at {venue} on {dates}."
		documents.append(sentence)
		print("Added document: ", sentence)

		count += 1
		if count == 10:
			break

print("\nTotal documents created: ", len(documents))

embeddings = model.encode(documents)
print("\nEmbeddings shape: ", embeddings.shape)

print("Embeddings vector size: ", embeddings.shape)

print("\nFirst Document:")
print(documents[0])

print("\nFirst embedding vector:")
print(embeddings[0])