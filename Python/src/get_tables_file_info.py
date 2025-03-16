import os

def parse_tables_file(file_path):
    tables_info = []
    with open(file_path, 'r') as file:
        lines = file.readlines()
        table_name = None
        fields = []
        for line in lines:
            line = line.strip()
            if line.startswith('table'):
                if table_name:
                    tables_info.append({'table_name': table_name, 'fields': fields})
                # table_name is the third item in the line enclosed in double quotes    
                table_name = line.split('"')[1]
                fields = []
            elif line.startswith('field('):
                print(line)
                field_name = line.split(";")[1]
                fields.append(field_name)
        if table_name:
            tables_info.append({'table_name': table_name, 'fields': fields})
    return tables_info

def print_tables_info(tables_info):
    for table in tables_info:
        print(f"Table Name: {table['table_name']}")
        print("Fields:")
        for field in table['fields']:
            print(f"  - {field}")
        print()

def main():
    file_path = 'C:/work/GitHub/MSDyn/MSDyn365BC.Code.History/BaseApp/Source/Base Application/Invoicing/CalendarEvent.Table.al'
    if os.path.exists(file_path):
        tables_info = parse_tables_file(file_path)
        print_tables_info(tables_info)
    else:
        print(f"File not found: {file_path}")

if __name__ == "__main__":
    main()