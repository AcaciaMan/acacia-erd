import os

def parse_tables_file(file_path):
    tables_info = {}
    with open(file_path, 'r') as file:
        lines = file.readlines()
        table_name = None
        fields = []
        for line in lines:
            line = line.strip()
            if line.startswith('table '):
                # table_name is the third item in the line enclosed in double quotes
                try:    
                    table_name = line.split('"')[1].lower()
                except IndexError:
                    try:
                        table_name = line.split()[2].lower()
                    except IndexError:
                        print(f"Error parsing table name: {line}")
                        table_name = "error"    
                fields = []
            elif line.startswith('field('):
                # print(line)
                field_name = line.split(";")[1]
                # trim the field name and remove the double quotes
                field_name = field_name.strip().strip('"').lower()
                fields.append(field_name)
        if table_name:
            tables_info = {'id': table_name, 'name': table_name, 'columns': fields}
    return tables_info

def print_tables_info(tables_info):
    print(tables_info)

def main():
    file_path = 'C:/work/GitHub/MSDyn/MSDyn365BC.Code.History/BaseApp/Source/Base Application/Invoicing/CalendarEvent.Table.al'
    if os.path.exists(file_path):
        tables_info = parse_tables_file(file_path)
        print_tables_info(tables_info)
    else:
        print(f"File not found: {file_path}")

if __name__ == "__main__":
    main()