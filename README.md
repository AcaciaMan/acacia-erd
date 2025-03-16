# acacia-erd
Visual Studio Code extension for Entity Relationship Diagram

![Screenshot_erd](https://github.com/user-attachments/assets/d7fe0279-8503-4494-9580-92dbe970bdf4)

## WordPress ERD

![Screenshot_wordpress](https://github.com/user-attachments/assets/1d9ade83-b35f-4023-829f-94840ef9dc3c)

## Discourse ERD

![Screenshot Discourse](https://github.com/user-attachments/assets/ec06bd8c-47fa-4375-a0b9-4c67351dcc1d)

## Redmine ERD

![Screenshot Redmine](https://github.com/user-attachments/assets/47b84e7a-323d-470c-8509-918468181418)

## Oracle Select

```sql
SELECT
    JSON_OBJECT(
        'id' VALUE LOWER(table_name),
        'name' VALUE LOWER(table_name),
        'columns' VALUE LOWER(LISTAGG(column_name, ',') WITHIN GROUP (ORDER BY column_id))
    ) AS entity
FROM
    all_tab_columns
WHERE
    owner = 'YOUR_SCHEMA_NAME'
GROUP BY
    table_name
ORDER BY
    table_name;
```    
