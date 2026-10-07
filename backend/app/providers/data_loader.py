import os
import json

Dataset_Path = "data/cricsheet_raw/all_json"

files = os.listdir(Dataset_Path)

print("Total files found: ", len(files))

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

		