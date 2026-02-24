# Change Log

All notable changes to the "acacia-erd" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [2.2.3] - 2026-02-24

### Added
- **Source Folders Tree View** — New sidebar tree for managing source code directories with add, remove, rename, and refresh commands
- **DB Connections Tree View** — New sidebar tree for bookmarking database connection references with add, remove, rename, edit path, and refresh commands
- **SourceFolderManager** utility — CRUD operations for source folders persisted to workspace configuration (`acacia-erd.sourceFolders`)
- **DbConnectionManager** utility — CRUD operations for DB connections persisted to workspace configuration (`acacia-erd.dbConnections`)
- **Dashboard integration** — Quick Actions grid now includes Source Folders and DB Connections buttons; Project Status section shows live-updating counts for entities, source folders, and DB connections
- **EntityManager file watcher** — Auto-reloads entities on external create/change/delete events with debounced reload (300ms)
- **EntityManager event emitters** — `onDidChangeEntities` and `onDidChangeEntitiesPath` events for reactive updates
- **EntityManager configuration listener** — Watches `acacia-erd.entitiesJsonPath` setting changes and re-initializes
- **11 new commands** — Full CRUD operations for Source Folders and DB Connections tree views
- **Welcome views** — Shown when Source Folders or DB Connections lists are empty with call-to-action links
- **Test suites** — New tests for `SourceFoldersTreeProvider` and `DbConnectionsTreeProvider`

### Improved
- **EntityManager path resolution** — Resolves relative paths from workspace root; stores workspace-relative paths in settings
- **EntityManager disposal** — Properly disposes file watcher, config listener, event emitters, and debounce timeout
- **ERDViewProvider** — Now accepts `SourceFolderManager` and `DbConnectionManager` instances with auto-updating status

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