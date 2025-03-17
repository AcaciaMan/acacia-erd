import json
import Levenshtein

def compareNames(name1, name2):
    """
    Compare two names using Levenshtein distance.

    Parameters:
    name1 (str): The first name to compare.
    name2 (str): The second name to compare.

    Returns:
    int: The Levenshtein distance between the two names.
    """

    distance = Levenshtein.distance(name1.lower(), name2.lower())
    maxLength = max(len(name1), len(name2))

    return distance / maxLength

def calcSecondImportance(entities):
    """
    Calculate the second importance of each entity.

    Parameters:
    entities (list): A list of dictionaries representing entities.
        Each dictionary has the following
        keys: "id", "name" - the name of the entity, "columns" - a list of column names.


    Returns:
    list: A list of dictionaries representing entities with the following
        keys: "name" - the name of the entity, "columns" - a list of column names,
        "linked_entities" - a list of strings representing linked entities ids,
        "second_importance" - the second importance of the entity.
    """

    bLinkColumns = False
    # calculate the importance of the entity based on entity name and columns
    for entity in entities:
        entity['importance'] = 0
        entity['linkedEntities'] = []
        # if entity name is in other entity columns, increase importance
        for other in entities:
            bLinkColumns = False
            if entity != other and 'columns' in other:
                for column in other['columns']:
                    if compareNames(entity['name'], column) < 0.5:
                        entity['importance'] += 1
                        other['importance'] += 1
                        if not bLinkColumns:
                            entity['linkedEntities'].append(other['id'])
                        bLinkColumns = True
            if not bLinkColumns:
                if compareNames(entity['name'], other['name']) < 0.5 and len(entity['name']) < len(other['name']):
                    entity['importance'] += 1
                    other['importance'] += 1
                    entity['linkedEntities'].append(other['id'])

    entities_ids = {entity['id']: entity for entity in entities}                

    # calculate the second_importance of the entity based on entity name and columns
    for entity in entities:
        entity['second_importance'] = entity['importance']
        for other in entity['linkedEntities']:
            entity['second_importance'] += entities_ids[other]['importance']
            entities_ids[other]['second_importance'] += entity['importance']

    return entities

if __name__ == "__main__":
    # read the entities from the json file
    with open("msdyn_entities.json", "r") as file:
        entities = json.load(file)
        entities = calcSecondImportance(entities)

    # write the entities to a new json file
    with open("msdyn_entities.json", "w") as file:
        json.dump(entities, file, indent=4)

    # print the top 20 entities
    # sort the entities by second_importance
    entities.sort(key=lambda x: x['second_importance'], reverse=True)
    for entity in entities[:20]:
        print(f"{entity['name']} - {entity['second_importance']}")        