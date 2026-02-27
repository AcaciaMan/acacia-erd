# Change Log

All notable changes to the "acacia-erd" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [2.3.1] - 2026-02-27

### Added
- **Dimension Manager** — New `DimensionManager` utility for defining, persisting, and managing custom dimensions (e.g., Level, Environment, Schema) with seed defaults and file-based storage (`acacia-erd.dimensions.json`)
- **Dimension Editor Panel** — Dedicated webview panel for creating, editing, and deleting dimensions and their values, with asset assignment matrix
- **Assign Dimensions context menu** — Right-click any Source Folder, DB Connection, or Entities List in the Assets tree to assign dimension values
- **Filter Assets by Dimensions** — Quick Pick multi-step filter: select a dimension, then pick values to show only matching assets in the tree
- **Filter badge & clear** — Active filter count badge on the Assets tree view; "Clear Asset Filters" button appears when filters are active
- **Inline dimension badges** — Assets tree items display dimension value badges for at-a-glance categorization
- **Interactive ERD dimension display** — Dimension assignments surfaced in the Interactive ERD Editor
- **Dimension configuration setting** — New `acacia-erd.dimensionsFilePath` setting to customize the dimensions file location
- **Dimension properties on asset configs** — `dimensions` object added to Source Folder, DB Connection, and Entities List configuration schemas
- **DimensionManager test suite** — Comprehensive tests for dimension CRUD, file persistence, and event handling
- **AssetsTreeProvider dimension tests** — Extended test suite covering dimension badges, filtering, and assignment

### Improved
- **AssetsTreeProvider** — Refactored to support dimension filtering, badge rendering, and `DimensionManager` integration
- **ERDViewProvider** — Now accepts `DimensionManager` for dimension-aware dashboard status
- **InteractiveERDPanel** — Enhanced to receive `DimensionManager` and `EntitiesListManager` for richer context

## [2.3.0] - 2026-02-27

### Added
- **Create New Entities List from UI** — The "Choose Entities List" dialog now offers both "Open Existing" and "Create New" options, allowing users to create a new empty entities JSON file directly from the Interactive ERD Editor
- **Save dialog for new entities lists** — Uses the native VS Code save dialog with a default filename and JSON filter, pre-populated with the workspace root

### Improved
- **Async entities list selection** — The `chooseEntitiesList` flow is now fully async/await for more reliable dialog handling
- **Refactored path application** — Extracted `applyEntitiesListPath` helper to reduce code duplication when setting the entities JSON path

## [2.2.3] - 2026-02-24

### Added
- **Unified Assets Tree** — Single sidebar tree combining Source Folders, DB Connections, and Entities Lists with collapsible sections
- **Entities Lists management** — Add, remove, rename, and edit paths for multiple entities JSON files, persisted to workspace configuration (`acacia-erd.entitiesLists`)
- **Active entities list indicator** — Check icon (✓) and "active" badge on the currently loaded entities list in the Assets tree
- **Select entities list** — Click an entities list in Assets to switch the active entities file across all views
- **Entity Tree file indicator** — Shows which entities JSON file is currently loaded in the Entity Tree header
- **Entity Tree enhanced empty state** — Contextual messaging for filter-no-match vs no-entities-loaded, with "Browse Assets" action button
- **InteractiveERD path sync** — Path display in Interactive ERD Editor auto-updates when switching entities lists
- **Dashboard integration** — Quick Actions grid with "View Entities" and "View Assets" buttons; Project Status shows live counts for entities, entities lists, source folders, and DB connections
- **SourceFolderManager** utility — CRUD operations for source folders persisted to workspace configuration (`acacia-erd.sourceFolders`)
- **DbConnectionManager** utility — CRUD operations for DB connections persisted to workspace configuration (`acacia-erd.dbConnections`)
- **EntitiesListManager** utility — CRUD operations for entities lists persisted to workspace configuration (`acacia-erd.entitiesLists`)
- **EntityManager file watcher** — Auto-reloads entities on external create/change/delete events with debounced reload (300ms)
- **EntityManager event emitters** — `onDidChangeEntities` and `onDidChangeEntitiesPath` events for reactive updates
- **EntityManager configuration listener** — Watches `acacia-erd.entitiesJsonPath` setting changes and re-initializes
- **AssetsTreeProvider** — Native tree data provider with inline context menu actions (rename, edit path, remove)
- **Comprehensive test suites** — Tests for AssetsTreeProvider, EntitiesListManager, EntityTreePanel, ERDViewProvider, InteractiveERDPanel, and all extension commands

### Improved
- **Sidebar organization** — Consolidated three separate views into a single Assets tree for cleaner UX
- **EntityManager path resolution** — Resolves relative paths from workspace root; stores workspace-relative paths in settings
- **EntityManager disposal** — Properly disposes file watcher, config listener, event emitters, and debounce timeout
- **ERDViewProvider** — Dashboard auto-updates status on entity/path/list/folder/connection changes

### Removed
- **Separate Source Folders and DB Connections tree views** — Replaced by unified Assets tree
- **Welcome views** for empty Source Folders / DB Connections — Replaced by empty-section labels in Assets tree

## [2.2.2] - 2026-02-24

### Changed
- Updated README.md with marketplace-optimized structure and SEO improvements
- Reorganized README sections for better conversion: hero screenshot, key features, screenshots, quick start
- Improved first-paragraph keyword density for Marketplace search indexing
- Updated documentation links to point to GitHub pages

### Fixed
- Fixed internal documentation links that didn't work on the VS Code Marketplace
- Version consistency across all documentation files

## [2.2.1] - 2026-02-20

### Improved
- **Type Safety** — Eliminated `any` types from `EntityManager`, `ObjectRegistry`, `DescribeEntity`, and panel classes
- **Strict TypeScript** — Enabled strict mode in `tsconfig.json` with full type checking
- **Marketplace Presentation** — Added gallery banner, badges, and improved icon
- **Command Naming** — Replaced scaffold `Hello World` command with proper `Open ERD Editor` and `Show Entity Tree` commands
- **View Container** — Renamed from `myExtensionContainer` to `acaciaErdContainer` with proper casing
- **Display Name** — Updated to "Acacia ERD - Entity Relationship Diagrams" for better discoverability
- **Description** — Updated to highlight key features: interactive editor, drag-and-drop, HTML export
- **Keywords** — Optimized 10 keywords for Marketplace search ranking
- **Categories** — Refined to "Visualization" for better categorization

### Added
- Comprehensive test suite: `EntityManager`, `ObjectRegistry`, `HtmlExporter`, panels, and extension tests
- Test infrastructure with helpers, mocks, and CI/CD configuration
- ESLint configuration (`eslint.config.mjs`)
- Marketplace badges (version, installs, rating, license)
- New commands: `acacia-erd.openERDEditor`, `acacia-erd.showEntityTree`

### Removed
- Removed leftover `acacia-erd.helloWorld` scaffold command

## [2.2.0] - 2025-10-15

### 🎉 Major New Feature

#### 🌐 Interactive HTML Export
Export your ERDs as **standalone interactive HTML files** that work in any browser!

**Added:**
- **One-click HTML export** from Interactive ERD panel
- **Fully interactive viewer** with zoom, pan, and search capabilities
- **Click entities** to highlight relationships with color coding:
  - Red: Selected entity
  - Green: Entities referenced by selected
  - Yellow: Entities that reference selected
- **Light/Dark theme toggle** with smooth transitions
- **Search functionality** to quickly find entities
- **Keyboard shortcuts** for efficient navigation (+, -, 0, F, T, /)
- **Mobile-responsive design** that works on phones and tablets
- **Info panel** showing entity details on double-click
- **Status bar** with entity count, relationship count, and zoom level
- **Export SVG** functionality from the HTML viewer
- **Fit to screen** and reset view controls
- **Zero external dependencies** - completely self-contained single HTML file

**Documentation:**
- Added comprehensive user guide: `docs/INTERACTIVE_HTML_EXPORT.md`
- Added implementation details: `docs/IMPLEMENTATION_SUMMARY.md`
- Added testing guide: `docs/TESTING_GUIDE.md`

**Technical:**
- New `HtmlExporter` utility class for managing exports
- Standalone HTML template with all features embedded
- Command palette integration: "Export ERD as Interactive HTML"
- Green "Export HTML" button in Interactive ERD toolbar

**Use Cases:**
- Share database schemas with non-technical stakeholders
- Embed living documentation in project wikis
- Create interactive presentations and demos
- Email diagrams that anyone can explore
- Host on GitHub Pages or documentation sites

### Changed
- Updated README.md with prominent feature showcase
- Updated version to 2.2.0
- Enhanced use cases and documentation

### Fixed
- N/A (New feature release)

## [2.1.0] - Previous Release

- Initial stable release
- Interactive ERD Editor
- Entity Tree View
- SVG Export
- JSON Import
- Grid Layout
- Oracle Database Integration