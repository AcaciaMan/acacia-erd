# Acacia ERD

**Entity Relationship Diagram (ERD) Visualization for VS Code**

A powerful VS Code extension for creating, managing, and visualizing Entity Relationship Diagrams with an intuitive grid-based layout system. Perfect for database design, documentation, and understanding complex data relationships.

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=manacacia.acacia-erd)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.98.0+-007ACC.svg)](https://code.visualstudio.com/)

## 🎉 What's New in v2.2.0

### 🌐 Interactive HTML Export

**Export your ERDs as standalone interactive HTML files!** This game-changing feature lets you share your database diagrams with anyone - no VS Code or special software required.

**Highlights:**
- ✨ One-click export to interactive HTML
- 🔍 Full interactivity: zoom, pan, search, click to explore
- 🎨 Beautiful light/dark themes
- 📱 Works on any device (desktop, tablet, mobile)
- 📧 Perfect for sharing with stakeholders, teams, and clients
- 📚 Ideal for documentation, wikis, and presentations

Try it now: Open an ERD and click the green "Export HTML" button! 🚀

---

<img alt="Screenshot_erd" src="https://github.com/user-attachments/assets/f15c2f45-4a24-454a-b91a-b5bae3ce3dd4" />

## ✨ Features

### � **NEW! Interactive HTML Export** ⭐
Export your ERDs as **standalone interactive HTML files** that work in any browser!

- **📧 Share with Anyone**: No VS Code or special software required to view
- **🔍 Fully Interactive**: Zoom, pan, search, and click entities to explore relationships
- **🎨 Beautiful Themes**: Toggle between light and dark modes
- **📱 Mobile-Friendly**: Works perfectly on phones and tablets
- **📚 Perfect for Documentation**: Embed in wikis, websites, or email to team members
- **🚀 One-Click Export**: Single HTML file with everything embedded
- **⚡ Lightning Fast**: No server required, runs entirely in the browser

**Use Cases:**
- Share database schemas with non-technical stakeholders
- Embed living documentation in project wikis
- Create interactive presentations and demos
- Host on GitHub Pages or internal documentation sites

[Learn more about Interactive HTML Export →](docs/INTERACTIVE_HTML_EXPORT.md)

---

### �🎨 **Interactive ERD Editor**
- **Drag & Drop Entities**: Easily position entities on the canvas
- **Visual Relationship Mapping**: Clear visualization of entity relationships
- **Grid-Based Layout**: Automatic and manual grid layout options
- **Real-time Editing**: Live updates as you modify entities

### 📊 **Multiple View Modes**
- **Interactive Canvas**: Full-featured ERD editor with toolbar
- **Entity Tree View**: Browse entities in a hierarchical list or card view
- **Describe Entity**: Detailed view of entity columns and relationships
- **Generate ERD**: Create diagrams from JSON entity definitions

### 🔍 **Smart Entity Management**
- **Search & Filter**: Quickly find entities in large diagrams
- **Auto-discover Relationships**: Automatically identify linked entities
- **Column Management**: Define and organize entity columns
- **Relationship Tracking**: Visual indicators for entity connections

### 💾 **Import & Export**
- **Interactive HTML Export**: Share diagrams that anyone can explore in a browser ⭐ NEW!
- **SVG Export**: Save diagrams as scalable vector graphics
- **JSON Import**: Load entity definitions from JSON files
- **Database Integration**: Import directly from Oracle databases (see examples)

### 🎯 **User-Friendly Interface**
- **Modern Design**: Clean, VS Code-integrated UI
- **Keyboard Shortcuts**: Efficient workflow with shortcuts
- **Context Menus**: Quick access to common actions
- **Status Bar**: Real-time entity and relationship counts

## 📸 Screenshots

### WordPress Database ERD
![Screenshot_wordpress](https://github.com/user-attachments/assets/1d9ade83-b35f-4023-829f-94840ef9dc3c)

### Discourse Database ERD
![Screenshot Discourse](https://github.com/user-attachments/assets/ec06bd8c-47fa-4375-a0b9-4c67351dcc1d)

### Redmine Database ERD
![Screenshot Redmine](https://github.com/user-attachments/assets/47b84e7a-323d-470c-8509-918468181418)

## 🚀 Getting Started

### Installation

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS)
3. Type: `ext install manacacia.acacia-erd`
4. Press Enter

Or search for "Acacia ERD" in the VS Code Extensions marketplace.

### Quick Start

1. **Open the Acacia ERD sidebar** by clicking the ERD icon in the Activity Bar
2. **Create a new ERD** by clicking "Open ERD Editor" in the Manage ERD view
3. **Add entities** by dragging them from the Entity Tree or generating from JSON
4. **Arrange entities** using drag & drop or the "Apply Grid" button
5. **Save your diagram** using `Ctrl+S` or the Save button
6. **Export as Interactive HTML** using the "Export HTML" button 🌟 NEW!

## 📖 Usage Guide

### 🌐 Exporting Interactive HTML

Create shareable, interactive diagrams that anyone can explore:

1. **Open your ERD** in the Interactive ERD Editor
2. **Click "Export HTML"** in the toolbar (green button)
3. **Choose a location** and save the file
4. **Share the file** - recipients can open it in any browser!

**What you get:**
- ✅ Fully interactive diagram with zoom, pan, and search
- ✅ Click entities to highlight relationships
- ✅ Dark/light theme toggle
- ✅ Mobile-responsive design
- ✅ No installation or VS Code required to view
- ✅ Perfect for documentation, presentations, and team sharing

**Try it yourself:** Export an ERD and open it in your browser to see the magic! ✨

[→ See full Interactive HTML Export guide](docs/INTERACTIVE_HTML_EXPORT.md)

---

### Creating an ERD from JSON

1. Prepare your entities JSON file (see format below)
2. Click "Generate ERD from Entities List" in the toolbar
3. Select your JSON file
4. Configure generation parameters (max entities, auto-discover)
5. Click "Generate ERD"

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
- `Ctrl+S` / `Cmd+S` - Save ERD as SVG
- `Ctrl+Shift+S` / `Cmd+Shift+S` - Save As new SVG file
- `Ctrl+F` / `Cmd+F` - Focus search (in Entity Tree)

#### Interactive HTML Export (in browser)
- `+` or `=` - Zoom in
- `-` - Zoom out
- `0` - Reset view
- `F` - Fit to screen
- `T` - Toggle theme (light/dark)
- `/` - Focus search
- `Esc` - Clear search

#### Entity Tree
- Double-click entity - Open entity details
- Right-click entity - Show context menu

### Entity Tree Views

- **List View**: Compact list showing entity names and metadata
- **Card View**: Expanded cards with descriptions and statistics

### Context Menu Options

- **Open Details** - View/edit entity properties
- **Describe Entity** - See detailed column information
- **Delete Entity** - Remove entity from diagram

## 🔧 Configuration

Configure the extension in VS Code settings:

```json
{
  "acacia-erd.entitiesJsonPath": "resources/entities.json"
}
```

## 🗄️ Database Integration

### Oracle Database

Export your database schema to JSON using this SQL query:

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

## 🎯 Use Cases

- **Database Design**: Plan and visualize database schemas
- **Documentation**: Create clear, interactive diagrams for technical documentation
- **Team Collaboration**: Share diagrams that anyone can explore in their browser
- **Client Presentations**: Present interactive ERDs without requiring VS Code
- **Code Understanding**: Map existing database structures
- **Knowledge Sharing**: Email interactive diagrams to stakeholders
- **Migration Planning**: Understand relationships before schema changes
- **Training Materials**: Create self-explanatory database documentation
- **Wiki Integration**: Embed interactive diagrams in project wikis

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This extension is licensed under the [MIT License](LICENSE).

## 🐛 Issues & Feature Requests

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/AcaciaMan/acacia-erd/issues).

## 📚 Additional Resources

- [Wiki Documentation](https://github.com/AcaciaMan/acacia-erd/wiki/Create-ER-diagram-help)
- [GitHub Repository](https://github.com/AcaciaMan/acacia-erd)

## 🌟 Show Your Support

If you find this extension helpful, please consider:
- ⭐ Starring the [GitHub repository](https://github.com/AcaciaMan/acacia-erd)
- 📝 Writing a review on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=manacacia.acacia-erd)
- 🐦 Sharing with your developer community

---

**Made with ❤️ by AcaciaMan**    
