import os


def find_table_files(directory):
    table_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".Table.al"):
                table_files.append(os.path.join(root, file))
    return table_files

if __name__ == "__main__":
    directory = "C:/work/GitHub/MSDyn/MSDyn365BC.Code.History"
    table_files = find_table_files(directory)
    #for file in table_files:
    #    print(file)
    print(len(table_files))