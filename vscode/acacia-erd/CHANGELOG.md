# Change Log

All notable changes to the "acacia-erd" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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