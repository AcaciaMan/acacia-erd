# Acacia ERD — Interactive Entity Relationship Diagrams for VS Code

Create, visualize, and share Entity Relationship Diagrams (ERDs) in VS Code. Design database schemas with drag-and-drop, auto-discover table relationships, and export interactive HTML diagrams that anyone can explore in a browser.

[![Version](https://img.shields.io/visual-studio-marketplace/v/manacacia.acacia-erd)](https://marketplace.visualstudio.com/items?itemName=manacacia.acacia-erd)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/manacacia.acacia-erd)](https://marketplace.visualstudio.com/items?itemName=manacacia.acacia-erd)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/manacacia.acacia-erd)](https://marketplace.visualstudio.com/items?itemName=manacacia.acacia-erd)
[![License](https://img.shields.io/github/license/AcaciaMan/acacia-erd)](https://github.com/AcaciaMan/acacia-erd/blob/main/LICENSE)

![Entity Relationship Diagram visualization in VS Code](https://github.com/user-attachments/assets/f607db8d-67d2-46ab-adf6-4d656ca5a61f)

## Key Features

- **Interactive ERD Editor** — Drag-and-drop entities on a canvas, visualize relationships, and edit in real time
- **Interactive HTML Export** — Export standalone HTML files that work in any browser with zoom, pan, search, and dark/light themes
- **Smart Entity Management** — Auto-discover relationships, search and filter entities, manage columns
- **Multiple View Modes** — Interactive canvas, entity tree (list and card views), describe entity, and ERD generation
- **Database Integration** — Import schemas from Oracle, PostgreSQL, and MySQL with ready-to-use SQL queries
- **SVG & JSON Support** — Save diagrams as SVG, load entity definitions from JSON files

| Feature | Acacia ERD |
|---------|-----------|
| Interactive HTML Export | Yes |
| Drag & Drop Layout | Yes |
| VS Code Integration | Yes |
| Multi-Database Support | Yes |
| No Account Required | Yes |
| Works Offline | Yes |

## Screenshots

### Interactive ERD Editor

![Entity Relationship Diagram visualization in VS Code](https://github.com/user-attachments/assets/f607db8d-67d2-46ab-adf6-4d656ca5a61f)

### Interactive HTML Export — Shareable Diagrams

![Interactive HTML export of an Entity Relationship Diagram](https://github.com/user-attachments/assets/38852015-5e82-4138-89d4-b26863a15a4a)

### WordPress Database ERD

![WordPress database Entity Relationship Diagram](https://github.com/user-attachments/assets/1d9ade83-b35f-4023-829f-94840ef9dc3c)

### Discourse Database ERD

![Discourse database Entity Relationship Diagram](https://github.com/user-attachments/assets/ec06bd8c-47fa-4375-a0b9-4c67351dcc1d)

### Redmine Database ERD

![Redmine database Entity Relationship Diagram](https://github.com/user-attachments/assets/47b84e7a-323d-470c-8509-918468181418)

## What's New in v2.3.0

### Create Entities Lists from UI
- **New or Open** — The "Choose Entities List" dialog now lets you create a brand-new entities JSON file or browse for an existing one
- **Save dialog** — Native VS Code save dialog pre-filled with your workspace root and a `.json` filter

### Previously in v2.2.3

### Unified Assets Tree & Entities Lists
- **Assets sidebar** — Single tree view combining Entities Lists, Source Folders, and DB Connections with collapsible sections
- **Entities Lists management** — Add, remove, rename, and switch between multiple entities JSON files
- **Active list indicator** — See which entities list is currently loaded with a check icon (✓) and "active" badge
- **Entity Tree file indicator** — Know which file is loaded directly in the Entity Tree header
- **Smart empty state** — Contextual guidance when no entities are loaded, with quick "Browse Assets" action

### Project Dashboard
- **Quick Actions** — View Entities and View Assets buttons for fast navigation
- **Live Status** — Real-time counts for entities, entities lists, source folders, and DB connections

### EntityManager Improvements
- File watcher auto-reloads entities on external changes
- Event emitters for reactive UI updates across all views
- Improved path resolution and proper resource disposal

### Interactive HTML Export

Export your ERDs as standalone interactive HTML files — share database diagrams with anyone, no VS Code required.

- One-click export to interactive HTML
- Full interactivity: zoom, pan, search, click to explore
- Beautiful light/dark themes, mobile-responsive design
- Perfect for sharing with stakeholders, teams, and documentation

[Learn more about Interactive HTML Export](https://github.com/AcaciaMan/acacia-erd/blob/main/vscode/acacia-erd/docs/INTERACTIVE_HTML_EXPORT.md)

## Quick Start

### Installation

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS)
3. Type: `ext install manacacia.acacia-erd`
4. Press Enter

Or search for **"Acacia ERD"** in the VS Code Extensions marketplace.

### First Steps

1. **Open the Acacia ERD sidebar** — click the ERD icon in the Activity Bar
2. **Open the ERD Editor** — use the Command Palette (`Ctrl+Shift+P`) and type `Acacia ERD: Open ERD Editor`
3. **Add entities** — generate from a JSON file or drag from the Entity Tree
4. **Arrange entities** — drag and drop or click "Apply Grid" for automatic layout
5. **Save your diagram** — `Ctrl+S` to save as SVG
6. **Export as Interactive HTML** — click the "Export HTML" button in the toolbar

## Usage Guide

### Exporting Interactive HTML

Create shareable, interactive diagrams:

1. Open your ERD in the Interactive ERD Editor
2. Click "Export HTML" in the toolbar (green button)
3. Choose a location and save the file
4. Share — recipients open it in any browser

What you get: fully interactive diagram with zoom, pan, search, entity highlighting, dark/light theme toggle, and mobile-responsive design. No installation required to view.

[Full Interactive HTML Export guide](https://github.com/AcaciaMan/acacia-erd/blob/main/vscode/acacia-erd/docs/INTERACTIVE_HTML_EXPORT.md)

### Creating an ERD from JSON

1. Prepare your entities JSON file (see format below)
2. Click "Generate ERD from Entities List" in the toolbar
3. Select your JSON file and configure generation parameters
4. Click "Generate ERD"

#### JSON Format

```json
[
  {
    "id": "user",
    "name": "User",
    "description": "User account information",
    "columns": ["id", "username", "email", "created_at"],
    "linkedEntities": ["Post", "Comment"]
  },
  {
    "id": "post",
    "name": "Post",
    "description": "Blog posts created by users",
    "columns": ["id", "user_id", "title", "content", "published_at"],
    "linkedEntities": ["User", "Comment", "Category"]
  }
]
```

### Keyboard Shortcuts

#### ERD Editor
- `Ctrl+S` / `Cmd+S` — Save ERD as SVG
- `Ctrl+Shift+S` / `Cmd+Shift+S` — Save As new SVG file
- `Ctrl+F` / `Cmd+F` — Focus search (in Entity Tree)

#### Interactive HTML Export (in browser)
- `+` / `=` — Zoom in
- `-` — Zoom out
- `0` — Reset view
- `F` — Fit to screen
- `T` — Toggle theme
- `/` — Focus search
- `Esc` — Clear search

#### Entity Tree
- Double-click entity — Open entity details
- Right-click entity — Show context menu

### Entity Tree Views

- **List View** — Compact list showing entity names and metadata
- **Card View** — Expanded cards with descriptions and statistics

### Context Menu Options

- **Open Details** — View/edit entity properties
- **Describe Entity** — See detailed column information
- **Delete Entity** — Remove entity from diagram

## Configuration

Configure the extension in VS Code settings:

```json
{
  "acacia-erd.entitiesJsonPath": "resources/entities.json",
  "acacia-erd.entitiesLists": [
    { "name": "Main Schema", "jsonPath": "resources/entities.json" },
    { "name": "Auth Module", "jsonPath": "resources/auth_entities.json" }
  ],
  "acacia-erd.sourceFolders": [
    { "name": "App Source", "path": "src" },
    { "name": "Migrations", "path": "db/migrate" }
  ],
  "acacia-erd.dbConnections": [
    { "name": "Dev DB", "connectionPath": "sqlite:///data/dev.db" },
    { "name": "Test DB", "connectionPath": "localhost:5432/testdb" }
  ]
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `entitiesJsonPath` | `string` | `"resources/entities.json"` | Path to the active entities JSON file |
| `entitiesLists` | `array` | `[]` | Named references to entities JSON files |
| `sourceFolders` | `array` | `[]` | Project source code directories |
| `dbConnections` | `array` | `[]` | Database connection references (no credentials) |

## Database Integration

Import your existing database schema into Acacia ERD using SQL queries for Oracle, PostgreSQL, and MySQL.

### Oracle

```sql
SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
        'id' VALUE LOWER(table_name),
        'name' VALUE LOWER(table_name),
        'description' VALUE NULL,
        'columns' VALUE (
            SELECT JSON_ARRAYAGG(LOWER(column_name) ORDER BY column_id)
            FROM all_tab_columns t1
            WHERE t1.owner = t.owner AND t1.table_name = t.table_name
        ),
        'linkedEntities' VALUE (
            SELECT JSON_ARRAYAGG(DISTINCT LOWER(r.table_name))
            FROM all_constraints c
            JOIN all_cons_columns cc ON c.constraint_name = cc.constraint_name 
                AND c.owner = cc.owner
            JOIN all_constraints r ON c.r_constraint_name = r.constraint_name 
                AND c.r_owner = r.owner
            WHERE c.owner = t.owner 
                AND c.table_name = t.table_name 
                AND c.constraint_type = 'R'
        )
    )
) AS entities
FROM all_tables t
WHERE owner = 'YOUR_SCHEMA_NAME'
ORDER BY table_name;
```

### PostgreSQL

```sql
SELECT json_agg(
    json_build_object(
        'id', table_name,
        'name', table_name,
        'columns', (
            SELECT json_agg(column_name)
            FROM information_schema.columns c
            WHERE c.table_schema = t.table_schema 
                AND c.table_name = t.table_name
        )
    )
)
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
```

### MySQL

```sql
SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
        'id', table_name,
        'name', table_name,
        'columns', (
            SELECT JSON_ARRAYAGG(column_name)
            FROM information_schema.columns c
            WHERE c.table_schema = t.table_schema 
                AND c.table_name = t.table_name
        )
    )
)
FROM information_schema.tables t
WHERE table_schema = 'your_database';
```

## Use Cases

- **Database Design** — Plan and visualize database schemas
- **Documentation** — Create interactive diagrams for technical documentation
- **Team Collaboration** — Share diagrams that anyone can explore in their browser
- **Client Presentations** — Present interactive ERDs without requiring VS Code
- **Migration Planning** — Understand relationships before schema changes
- **Training Materials** — Create self-explanatory database documentation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the [MIT License](https://github.com/AcaciaMan/acacia-erd/blob/main/LICENSE).

## Issues & Feature Requests

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/AcaciaMan/acacia-erd/issues).

## Additional Resources

- [Wiki Documentation](https://github.com/AcaciaMan/acacia-erd/wiki/Create-ER-diagram-help)
- [GitHub Repository](https://github.com/AcaciaMan/acacia-erd)

## Show Your Support

If you find this extension helpful, please consider:
- Starring the [GitHub repository](https://github.com/AcaciaMan/acacia-erd)
- Writing a review on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=manacacia.acacia-erd)
- Sharing with your developer community

---

**Made with care by AcaciaMan**
