# Interactive HTML Export Feature

## Overview

The Interactive HTML Export feature allows you to export your ERD diagrams as standalone, interactive HTML files that can be opened in any web browser without requiring VS Code or any other software.

## Features

### 🌐 **Browser-Based Interactivity**
- **Zoom & Pan**: Mouse wheel to zoom, drag to pan
- **Click to Highlight**: Click entities to see their relationships
- **Search**: Find entities quickly with the search bar
- **Theme Toggle**: Switch between light and dark themes
- **Info Panel**: Double-click entities to see detailed information

### 📱 **Cross-Platform**
- Works in any modern browser (Chrome, Firefox, Safari, Edge)
- No installation required
- Mobile-friendly responsive design
- Self-contained single HTML file

### 🎨 **Visual Features**
- **Color-coded relationships**:
  - 🔴 Red: Selected entity
  - 🟢 Green: Entities referenced by selected
  - 🟡 Yellow: Entities that reference selected
  - 🔵 Blue: Default state
- **Interactive legend**
- **Status bar** showing entity and relationship counts
- **Smooth animations**

### ⌨️ **Keyboard Shortcuts**
- `+` or `=`: Zoom in
- `-`: Zoom out
- `0`: Reset view
- `F`: Fit to screen
- `T`: Toggle theme
- `/`: Focus search
- `Esc`: Clear search

## How to Use

### Export from VS Code

1. **Open your ERD** in the Interactive ERD panel
2. **Click the "Export HTML" button** in the toolbar (green button)
3. **Choose a location** to save the HTML file
4. **Open the exported file** in your browser

### Alternative Method (Command Palette)

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Export ERD as Interactive HTML"
3. Follow the prompts

## Use Cases

### 📚 **Documentation**
- Embed in project wikis
- Include in README files
- Add to documentation sites
- Host on GitHub Pages

### 📧 **Sharing**
- Email to team members
- Share with stakeholders
- Send to clients
- No VS Code required to view

### 🎤 **Presentations**
- Open in browser for demos
- Interactive walkthroughs
- Client presentations
- Training materials

### 📦 **Version Control**
- Commit to repository
- Track changes over time
- Include in releases
- Easy comparison between versions

## Technical Details

### What's Included in the HTML File

The exported HTML file is completely self-contained and includes:
- All ERD entities and their data
- Complete styling (CSS)
- All interactive functionality (JavaScript)
- No external dependencies
- No internet connection required

### Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### File Size

Typical file sizes:
- Small ERD (10 entities): ~50KB
- Medium ERD (50 entities): ~100KB
- Large ERD (200 entities): ~250KB

## Examples

### Basic Workflow

```
1. Create ERD in VS Code
   ↓
2. Click "Export HTML"
   ↓
3. Save as "my-database-schema.html"
   ↓
4. Open in browser
   ↓
5. Share with team!
```

### Documentation Example

```markdown
# Database Schema

Our database schema can be explored interactively:

[View Interactive ERD](./docs/database-schema.html)

Click entities to see relationships!
```

### GitHub Pages Example

1. Export your ERD as HTML
2. Save to your repo's `docs/` folder
3. Enable GitHub Pages
4. Access at: `https://yourusername.github.io/yourrepo/erd.html`

## Customization

### Modifying the Exported HTML

The exported HTML file can be customized:

1. **Change colors**: Edit CSS variables at the top
2. **Add branding**: Insert logo/header HTML
3. **Extend functionality**: Add custom JavaScript
4. **Embed in websites**: Copy and integrate the code

Example CSS customization:
```css
:root {
    --entity-default: #your-color;
    --entity-selected: #your-color;
}
```

## Troubleshooting

### HTML file won't open
- **Solution**: Make sure you're opening it in a web browser, not a text editor
- Try right-click → Open With → Browser

### Search not working
- **Solution**: Click in the search box first
- Try pressing `/` to focus the search

### Zoom too sensitive
- **Solution**: Use the zoom buttons instead of mouse wheel
- Press `0` to reset

### Export button not visible
- **Solution**: Make sure you have an ERD open in the Interactive ERD panel
- Try reopening the ERD

## Privacy & Security

- ✅ No data is sent to external servers
- ✅ All processing happens in your browser
- ✅ No tracking or analytics
- ✅ Safe to share (contains only your ERD data)

## Comparison with SVG Export

| Feature | HTML Export | SVG Export |
|---------|-------------|------------|
| File Type | .html | .svg |
| Interactivity | ✅ Full | ❌ None |
| Zoom/Pan | ✅ Built-in | Depends on viewer |
| Search | ✅ Yes | ❌ No |
| Relationships | ✅ Click to highlight | ❌ Static |
| File Size | Larger (~100KB) | Smaller (~20KB) |
| Editing | ❌ Read-only | ✅ Editable in tools |
| Sharing | ✅ Open anywhere | ✅ Image viewers |

## Future Enhancements

Planned features:
- [ ] Export to PNG from HTML
- [ ] Print-optimized layout
- [ ] Custom color themes
- [ ] Annotation mode
- [ ] SQL generation from HTML
- [ ] Collaboration features

## Feedback

Have suggestions for the HTML export feature? Please:
- Open an issue on GitHub
- Star the repository if you find it useful
- Share your exported diagrams with the community!

## Credits

- Built with TypeScript and modern web standards
- Uses SVG for graphics
- Responsive design with CSS Grid/Flexbox
- No external dependencies

---

**Made with ❤️ by the Acacia ERD team**
