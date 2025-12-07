---
description: Markdown formatting rules for this project
applyTo: '**/*.md'
---

## Markdown List Formatting Rules

### Numbered Lists
- ALWAYS use "1." for every numbered list item
- NEVER use sequential numbers (2., 3., 4., etc.)
- This makes it easier to insert, remove, or reorder items

Example:
```markdown
1. First item
1. Second item
1. Third item
```

NOT:
```markdown
1. First item
2. Second item
3. Third item
```

### List Spacing
- NO blank lines between list items within the same list
- NO blank lines when indentation changes (sub-lists)
- DO include blank lines before and after the entire list

Example:
```markdown
Some text before.

1. Item one
1. Item two
   - Sub-item A
   - Sub-item B
1. Item three

Some text after.
```

NOT:
```markdown
Some text before.
1. Item one

1. Item two

   - Sub-item A
   
   - Sub-item B

1. Item three
Some text after.
```

### Heading Spacing
- ALWAYS include a blank line before a heading
- ALWAYS include a blank line after a heading

Example:
```markdown
Some paragraph text.

## Heading

More paragraph text.
```

### Summary
1. Use "1." for all numbered list items
1. No blank lines between list items
1. Blank lines before/after entire lists
1. Blank lines before/after headings
