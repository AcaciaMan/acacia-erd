# Quick Start Guide - Testing Interactive HTML Export

## Testing Steps

### 1. Launch Extension Development Host

1. Press `F5` in VS Code (with your extension project open)
2. A new "Extension Development Host" window will open

### 2. Create or Open an ERD

**Option A: Open existing ERD**
1. Click the Acacia ERD icon in the sidebar
2. Click "Open ERD Editor" in the Manage ERD view
3. If you have a saved SVG, click "Load" to open it

**Option B: Create new ERD**
1. Click the Acacia ERD icon in the sidebar
2. Click "Generate ERD from Entities List"
3. Select your `entities.json` file
4. Configure generation parameters
5. Click "Generate ERD"

**Option C: Quick test ERD**
Create a simple `test-entities.json`:
```json
[
  {
    "id": "user",
    "name": "User",
    "description": "User accounts",
    "columns": ["id", "email", "name", "created_at"],
    "linkedEntities": ["Post", "Comment"]
  },
  {
    "id": "post",
    "name": "Post",
    "description": "Blog posts",
    "columns": ["id", "user_id", "title", "content"],
    "linkedEntities": ["User", "Comment"]
  },
  {
    "id": "comment",
    "name": "Comment",
    "description": "Comments on posts",
    "columns": ["id", "post_id", "user_id", "text"],
    "linkedEntities": ["User", "Post"]
  }
]
```

### 3. Test HTML Export

1. **Find the Export Button**
   - Look in the toolbar for the green "Export HTML" button
   - It should be between "Load" and "Entities List"

2. **Click Export HTML**
   - A save dialog should appear
   - Choose a location (e.g., Desktop)
   - Name it `test-erd.html`
   - Click Save

3. **Check Success Message**
   - Should see: "ERD exported successfully to test-erd.html"
   - Two buttons: "Open in Browser" and "Show in Folder"

4. **Open in Browser**
   - Click "Open in Browser"
   - OR manually navigate to the file and open it

### 4. Test Interactive Features

Once the HTML opens in your browser:

#### Basic Interactions
- ✅ **Zoom In**: Click "+" button or press `+` key
- ✅ **Zoom Out**: Click "-" button or press `-` key
- ✅ **Reset View**: Click "Reset" button or press `0` key
- ✅ **Fit to Screen**: Click "Fit to Screen" button or press `F` key

#### Theme Toggle
- ✅ Click "Theme" button (should toggle between light/dark)
- ✅ Colors should change smoothly
- ✅ All text remains readable

#### Entity Interactions
- ✅ **Single Click**: Click any entity
  - Should turn red
  - Related entities should turn green (entities it references)
  - Referencing entities should turn yellow (entities that reference it)
- ✅ **Double Click**: Double-click an entity
  - Info panel should appear in top-left
  - Should show entity name, description, columns
  - Close button should work

#### Search
- ✅ Type in search box (e.g., "User")
  - Matching entities should be highlighted (gold color)
  - Non-matching entities should be dimmed (opacity 0.3)
- ✅ Clear search
  - Click X button or press `Esc`
  - All entities should return to normal

#### Pan/Drag
- ✅ Click and drag on empty space
  - Canvas should move
  - Cursor should change to grabbing hand

#### Mouse Wheel Zoom
- ✅ Scroll mouse wheel
  - Should zoom in/out
  - Should remain centered on mouse position

#### Legend
- ✅ Click "Toggle Legend" button
  - Legend should hide/show
  - State should toggle

#### Export SVG
- ✅ Click "Export SVG" button
  - Should download an SVG file
  - SVG should contain the diagram

#### Status Bar
- ✅ Check bottom status bar
  - Should show entity count
  - Should show relationship count
  - Should show current zoom level
  - Should show status messages

### 5. Mobile Testing (Optional)

If you have a mobile device:
1. Transfer the HTML file to your phone
2. Open in mobile browser
3. Test:
   - ✅ Touch to select entities
   - ✅ Pinch to zoom
   - ✅ Drag to pan
   - ✅ Search works

### 6. Cross-Browser Testing (Optional)

Open the same HTML file in:
- ✅ Chrome/Edge (should work perfectly)
- ✅ Firefox (should work perfectly)
- ✅ Safari (should work perfectly)

### 7. Edge Cases to Test

#### Empty ERD
1. Create ERD with no entities
2. Export to HTML
3. Should handle gracefully

#### Large ERD
1. Create ERD with 50+ entities
2. Export to HTML
3. Should load without lag
4. Search should still be fast

#### Special Characters
1. Create entities with special names: `User's Data`, `Email@Service`, `Multi-Word Name`
2. Export to HTML
3. Should display correctly
4. Search should find them

### 8. Verify File Contents

Open the exported HTML in a text editor:
- ✅ Should be one complete file
- ✅ Should contain `<!DOCTYPE html>`
- ✅ Should have embedded CSS (in `<style>` tags)
- ✅ Should have embedded JavaScript (in `<script>` tags)
- ✅ Should have ERD data as JSON
- ✅ Should have SVG content

### 9. Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Export button not visible | Make sure ERD panel is open |
| Save dialog doesn't appear | Check VS Code permissions |
| HTML file won't open | Try right-click → Open With → Browser |
| Entities not showing | Check SVG content was included |
| Search not working | Make sure data-entity attributes exist |
| Theme toggle not working | Check browser console for errors |

### 10. Success Criteria

All of these should work:
- ✅ Export completes without errors
- ✅ HTML file opens in browser
- ✅ Entities are visible
- ✅ Can zoom and pan
- ✅ Can click entities to highlight
- ✅ Search filters entities
- ✅ Theme toggle works
- ✅ All buttons respond
- ✅ Status bar updates
- ✅ Works on mobile (if tested)

## What to Do If Something Fails

1. **Check Developer Console**
   - Press F12 in browser
   - Look for errors in Console tab
   - Share error messages if asking for help

2. **Check VS Code Output**
   - View → Output
   - Select "Extension Host" from dropdown
   - Look for error messages

3. **Check the HTML File**
   - Open in text editor
   - Verify placeholders were replaced
   - Check if ERD data is present

4. **Try Debug Mode**
   - In VS Code, set breakpoints in `HtmlExporter.ts`
   - Press F5 to debug
   - Step through the export process

## Demo Script (for showing others)

```
"Let me show you the new HTML export feature:

1. Here's my database ERD with User, Post, and Comment entities
2. I'll click this Export HTML button
3. Save it as 'database-schema.html'
4. Now I'll open it in a browser - and look!
5. I can zoom in and out
6. Click this User entity - see how it highlights the relationships?
7. I can search for 'Post' - it filters instantly
8. And here's the cool part - this is a single HTML file
9. No installation needed, works on any device
10. I can email this to anyone and they can explore it!
11. Perfect for documentation, right?"
```

## Video Recording Checklist

If making a demo video:
- [ ] Show clean ERD in VS Code
- [ ] Click Export HTML button
- [ ] Show save dialog
- [ ] Open in browser (show browser opens)
- [ ] Demonstrate zoom (wheel and buttons)
- [ ] Click entity to show relationships
- [ ] Use search to find entities
- [ ] Toggle theme (light/dark)
- [ ] Double-click for info panel
- [ ] Show it's just one HTML file (in file explorer)
- [ ] Emphasize "no installation required"
- [ ] End with call-to-action (star on GitHub, etc.)

## Next Testing Phase

After basic testing works:
1. Get feedback from 2-3 users
2. Test with real-world ERDs
3. Performance test with 100+ entities
4. Accessibility audit (screen readers, keyboard-only)
5. Security review (XSS, injection)

---

**Good luck with testing!** If you find any issues, check the implementation files for troubleshooting guidance. 🚀
