# Release Checklist - v2.2.0

## Pre-Release Testing ✅

- [x] Feature works in development mode
- [x] Code compiles without errors
- [x] HTML export button appears
- [x] Export dialog works
- [x] Exported HTML opens in browser
- [x] All interactive features work (zoom, pan, search, click)
- [x] Theme toggle works
- [x] Mobile responsive (if tested)

## Documentation ✅

- [x] README.md updated with new feature
- [x] CHANGELOG.md updated
- [x] Version bumped to 2.2.0 in package.json
- [x] User guide created (INTERACTIVE_HTML_EXPORT.md)
- [x] Implementation summary created
- [x] Testing guide created

## Before Publishing

### 1. Final Testing
- [ ] Test with empty ERD
- [ ] Test with small ERD (5-10 entities)
- [ ] Test with large ERD (50+ entities if available)
- [ ] Test export file naming
- [ ] Test "Open in Browser" action
- [ ] Test "Show in Folder" action
- [ ] Verify no console errors in browser

### 2. Code Quality
- [ ] Run `npm run compile` - should succeed ✅ (Already passed!)
- [ ] Run `npm run lint` - should pass ✅ (Already passed!)
- [ ] No TODO or FIXME comments in production code
- [ ] Remove any debug console.log statements

### 3. Package Preparation
- [ ] Verify package.json metadata is correct
- [ ] Check that all new files are included in package
- [ ] Test build: `npm run package`
- [ ] Verify .vsix file size is reasonable

### 4. Screenshots/GIFs
- [ ] Create a demo GIF showing HTML export
- [ ] Take screenshot of exported HTML in browser
- [ ] Update marketplace screenshots (optional)

### 5. Publishing

#### Option A: VS Code Marketplace (Manual)
```bash
# Build the package
npm run package

# This creates acacia-erd-2.2.0.vsix

# Publish to marketplace (requires publisher account)
vsce publish
```

#### Option B: GitHub Release
1. Create Git tag:
   ```bash
   git tag v2.2.0
   git push origin v2.2.0
   ```

2. Create GitHub release:
   - Go to: https://github.com/AcaciaMan/acacia-erd/releases/new
   - Tag: v2.2.0
   - Title: "v2.2.0 - Interactive HTML Export"
   - Description: Copy from CHANGELOG.md
   - Attach .vsix file

### 6. Post-Release

#### Immediate
- [ ] Test installation from marketplace
- [ ] Verify version number shows correctly
- [ ] Check that new command appears in Command Palette

#### Marketing (Within 24 hours)
- [ ] Announce on GitHub Discussions/Releases
- [ ] Post on Reddit: r/vscode
- [ ] Post on Reddit: r/database
- [ ] Tweet/social media announcement
- [ ] Update VS Code marketplace description (if needed)

#### Within 1 Week
- [ ] Monitor for issues/bug reports
- [ ] Respond to feedback
- [ ] Update FAQ if needed
- [ ] Consider writing blog post

## Rollback Plan

If critical issues are found:

1. **Quick Fix Available** (< 2 hours)
   - Fix the issue
   - Bump to v2.2.1
   - Republish

2. **No Quick Fix** (> 2 hours)
   - Unpublish v2.2.0 from marketplace
   - Revert to v2.1.0
   - Investigate thoroughly
   - Fix and release v2.2.1 later

## Success Metrics (Track over 30 days)

- [ ] Installation count increase
- [ ] User ratings/reviews
- [ ] GitHub stars increase
- [ ] Issues opened (bugs vs features)
- [ ] Community feedback sentiment

**Target Goals:**
- 50+ new installs in first week
- Reach 500 total installs (from current 407)
- Maintain 4+ star rating
- Get at least 2-3 positive reviews mentioning HTML export

## Known Limitations to Document

If users report these, they're expected:
- HTML files are larger than SVG (by design - includes all features)
- Exported HTML is read-only (not an editor)
- Very large ERDs (100+ entities) may be slow on old devices
- Requires modern browser (2020+)

## Support Preparation

Have ready answers for:

**Q: "How do I export to HTML?"**
A: Open your ERD, click the green "Export HTML" button in the toolbar, choose save location. [Link to docs]

**Q: "The HTML file won't open"**
A: Right-click the file → Open With → Your Browser. The file needs to open in a web browser, not a text editor.

**Q: "Can I edit the exported HTML?"**
A: The HTML export is for viewing and sharing only. To make changes, edit in VS Code and export again.

**Q: "Can I customize the colors?"**
A: Currently uses default theme. Custom themes are planned for a future release!

**Q: "Does it work offline?"**
A: Yes! Both creating and viewing HTML exports work completely offline.

## Release Announcement Template

### Short Version (Twitter/Social)
```
🎉 Acacia ERD v2.2.0 is here!

NEW: Export your database diagrams as interactive HTML!
✅ Works in any browser
✅ Zoom, pan, search, click
✅ Share with anyone - no software needed
✅ Perfect for documentation

Try it now: [marketplace link]

#VSCode #Database #ERD
```

### Medium Version (Reddit)
```
[RELEASE] Acacia ERD v2.2.0 - Interactive HTML Export

Hey r/vscode! 

I just released a major update to my ERD extension that lets you export your database diagrams as interactive HTML files.

What's cool about it:
- One-click export to standalone HTML
- Recipients can zoom, pan, search, and explore relationships
- No VS Code or special software required to view
- Perfect for documentation, wikis, and sharing with non-tech stakeholders
- Works on mobile too!

This has been the most requested feature and I'm excited to finally ship it. The HTML files are completely self-contained with zero dependencies.

Link: [marketplace link]
Feedback welcome!
```

### Long Version (Blog Post)
Title: "Announcing Acacia ERD v2.2.0: Share Interactive Database Diagrams with Anyone"

- Introduction: The challenge of sharing technical diagrams
- The solution: Interactive HTML export
- How it works (with screenshots)
- Use cases and examples
- Technical details (for interested developers)
- What's next (roadmap teaser)
- Call to action: Try it and share feedback

---

## Final Pre-Publish Command

```bash
# One last check before publishing
npm run compile && npm run lint && npm run package
```

If all three succeed → Ready to publish! 🚀

## After Publishing

Update this checklist:
- [ ] Published to marketplace: [Date/Time]
- [ ] GitHub release created: [Date/Time]
- [ ] Announcement posted: [Where]
- [ ] Initial feedback: [Summary]

---

**Remember:** This is a great feature that solves a real problem. Be proud of shipping it! 🎉

Good luck with the release! 🚀
