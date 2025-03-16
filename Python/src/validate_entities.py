import json


def validate_entities(entities):
    # entities is a list of dictionaries
    # each dictionary has the following keys:
    # "name" - the name of the entity
    # "columns" - a list of column names

    # validate that each entity has a name and columns
    for entity in entities:
        if "name" not in entity:
            print(f"Entity missing name: {entity}")
        if "columns" not in entity:
            print(f"Entity missing columns: {entity}")

    # validate that each entity has at least one column
    for entity in entities:
        if "columns" in entity and len(entity["columns"]) == 0:
            print(f"Entity has no columns: {entity}")


# read the entities from the json file
with open("msdyn_entities.json", "r") as file:
    entities = json.load(file)
    validate_entities(entities)

# remove entities with no columns
entities = [entity for entity in entities if "columns" in entity and len(entity["columns"]) > 0]

# write the entities to a new json file
with open("msdyn_entities.json", "w") as file:
    json.dump(entities, file, indent=4)
