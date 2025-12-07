# Extension Icon

The Live Blog Writer extension needs an icon for the VS Code marketplace.

## Recommended Icon Design

**Concept**: A pencil/pen writing on paper with a broadcast/wifi signal emanating from it

**Colors**:

- Primary: VS Code blue (#007ACC)
- Accent: White or light gray (#FFFFFF or #E5E5E5)
- Optional accent: Orange/amber for the "live" aspect (#FF9800)

**Dimensions**: 128x128 pixels (PNG format)

**Style**: Flat, modern, minimal

## Icon Elements

1. **Main element**: A stylized pen/pencil (representing writing)
1. **Secondary element**: Waves or radio signals (representing "live" and "blog/publish")
1. **Background**: Solid color or subtle gradient

## Example ASCII Representation

```console
    ╱╲
   ╱──╲       )))
  ╱────╲     )))
 ╱──────╲   )))
╱────────╲
│  ✎     │
│        │
╲────────╱
```

## To Create the Actual Icon

1. Use a tool like:
   - [Figma](https://figma.com)
   - Adobe Illustrator
   - Inkscape (free)
   - [Canva](https://canva.com)
1. Export as PNG, 128x128px
1. Save as `icon.png` in the extension root
1. Add to package.json:

   ```json
   "icon": "icon.png"
   ```

## Alternative Emoji-Based Icon (Temporary)

If you need a quick placeholder:

- ✍️ (writing hand)
- 📝 (memo)
- 📡 (satellite/broadcast)
- 🖊️ (pen)

Choose one and create a simple square image with it.
