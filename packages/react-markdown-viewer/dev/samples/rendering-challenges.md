# Markdown Rendering Challenges

A collection of tricky markdown scenarios that often cause rendering issues.

---

## 1. Nested Code in Lists (8-Space Rule)

Code blocks inside list items require 8 spaces (4 for list + 4 for code):

- Item one with code below

        echo "This needs 8 spaces"
        echo "to be inside the list"

- Item two
    - Sub-item with code

            nested_code_here()

- Item three (code without blank line)
        this_might_fail()

---

## 2. Intra-Word Emphasis

### Underscores in Words

Should NOT be italic: some_variable_name, __init__, my_function_name

Should be italic: _surrounded by spaces_ and _at start_ and _at end_

### Asterisks in Words

Should be bold: intra**word**bold

Should work: **start** and **end** and mid**dle**word

### Mixed Snake Case

A_cat_meow vs A*cat*meow

file_name_here.txt should stay plain

---

## 3. Multi-Line Links

Standard link:
[This is a normal link](https://example.com)

Link text spanning lines:
[This link text spans
multiple lines](https://example.com)

Reference spanning lines:
[Multi-line
reference][ref1]

[ref1]: https://example.com

---

## 4. Table Challenges

### Basic Table

| A | B | C |
|---|---|---|
| 1 | 2 | 3 |

### Table Without Preceding Blank Line
This text immediately precedes the table:
| A | B |
|---|---|
| 1 | 2 |

### Pipe Characters in Tables

| Code | Escaped Pipe |
|------|--------------|
| `a \| b` | a \| b |
| `&#124;` | &#124; |

### Complex Content in Cells

| Feature | Example | Notes |
|---------|---------|-------|
| Bold | **text** | Works |
| Italic | *text* | Works |
| Code | `code` | Works |
| Link | [link](/) | Works |
| List | - no | Doesn't work |

### Wide Table (Horizontal Scroll)

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |
|----------|----------|----------|----------|----------|----------|----------|----------|
| Data that is quite long | More long data here | Even more data | Keeps going | And going | Still more | Almost done | Finally |

---

## 5. Emphasis Edge Cases (Rule of 3)

### Basic Nesting

***bold and italic***
___also bold and italic___

### The Rule of 3

`***foo***` → ***foo***

`**foo *bar* baz**` → **foo *bar* baz**

`*foo **bar** baz*` → *foo **bar** baz*

### Tricky Delimiter Runs

`a]]]***b***c` → a]]]***b***c

`*(*foo*)*` → *(*foo*)*

`**"foo"**` → **"foo"**

### Adjacent Emphasis

`**a]****b` → **a]****b

`***a]** b*` → ***a]** b*

---

## 6. List Indentation Challenges

### Tight vs Loose Lists

Tight (no blank lines):
- One
- Two
- Three

Loose (blank lines):

- One

- Two

- Three

### The 4-Space Rule

1. First item
   Continuation with 3 spaces (might break)
    
    Continuation with 4 spaces (should work)

2. Second item

### Mixed List Markers

* Asterisk item
- Dash item
+ Plus item

Should these be one list or three?

### Ordered List Year Trap

1968. This might become a list item
1968\. This should be escaped text

---

## 7. Link Edge Cases

### Nested Brackets

[foo [bar]](https://example.com)

[outer [inner] text](https://example.com)

[[double brackets]](https://example.com)

### Unbalanced Brackets

[foo [bar](https://example.com)

[unclosed bracket(https://example.com)

### Reference Link Variations

[Full reference][full]
[Collapsed][]
[Shortcut]

[full]: https://example.com "Full title"
[Collapsed]: https://example.com
[Shortcut]: https://example.com

### Missing Reference

[This reference does not exist][missing]

### Autolinks

Standard: <https://example.com>
Email: <test@example.com>
Plain URL: https://example.com (GFM autolinks this)

### Autolink vs Backticks

In code: `https://example.com`
Mixed: Check `https://example.com` for info

---

## 8. HTML Block Challenges

### Block Elements

<div>
Block content here.

More content in same div.
</div>

### Inline vs Block

<span>This is inline</span> and continues.

<div>This is block</div> and this is after.

### Details/Summary

<details>
<summary>Click to expand</summary>

- List item one
- List item two

```javascript
code_block();
```

</details>

### Nested HTML

<div>
<p>Paragraph in div</p>
<blockquote>Quote in div</blockquote>
</div>

---

## 9. Blockquote Challenges

### Lazy Continuation

> This is a blockquote
that continues without >
and keeps going.

### Nested Quotes

> Level 1
> > Level 2
> > > Level 3

> > Skipped level?

### Quote with List

> - Item 1
> - Item 2
>   - Nested
> - Item 3

### Quote with Code

> ```javascript
> const x = 1;
> ```

> Followed by text.

---

## 10. Code Block Challenges

### Fenced vs Indented After List

- List item

```
fenced after list
```

- Another item

    indented after list (is this code or list continuation?)

### Language Edge Cases

```c++
// C++ (plus signs in language)
int main() {}
```

```c#
// C# (hash in language)
class Program {}
```

```f#
// F# (hash in language)
let x = 1
```

### Triple Backticks in Code

````
Code containing ``` backticks
````

~~~
Code with ``` using tildes
~~~

### Empty Code Blocks

```
```

```python
```

---

## 11. Heading Challenges

### Heading with Trailing Hashes

## Heading ## 

### Not trailing (has space after)

## Heading ## not-closed

### Heading-like in Paragraph

The number #1 reason and ##2 reason.

### ATX Close Without Open

####### Too many hashes (7)

---

## 12. Horizontal Rules vs Lists

Text before
---
Text after (is --- a rule or setext heading?)

Text before

---

Text after (definitely a rule with blank lines)

* * *

Above is also a valid rule.

- - -

Dashes with spaces (rule).

---

## 13. Escaping Challenges

### All Escapable Characters

\\ \` \* \_ \{ \} \[ \] \( \) \# \+ \- \. \! \|

### Escaping in Different Contexts

Not italic: \*text\*
Not bold: \*\*text\*\*
Not code: \`text\`
Not link: \[text\](url)

### Escaping at Line Start

\# Not a heading
\- Not a list
\> Not a quote

---

## 14. Whitespace Challenges

### Trailing Spaces (Hard Break)

Line with two spaces at end  
This should be on new line.

### Backslash Line Break

Line with backslash\
This should be on new line.

### Tabs vs Spaces

	Tab-indented (should be code or not?)

    Four-space indented (code block)

### Multiple Blank Lines




Three blank lines above (should collapse to one).

---

## 15. Footnote Challenges

### Basic Footnotes

Simple footnote[^1].

[^1]: The footnote content.

### Long Footnote Names

Reference[^long-footnote-name-here].

[^long-footnote-name-here]: This has a very long identifier.

### Footnote with Complex Content

Multi-paragraph footnote[^complex].

[^complex]: First paragraph.

    Second paragraph with code:
    
    ```js
    const x = 1;
    ```
    
    And a list:
    - Item 1
    - Item 2

### Inline Footnote Attempts

Some text^[inline footnote attempt].

---

## 16. Math Challenges (if supported)

### Inline Math with Special Chars

$x < y$ and $a > b$

$a \leq b$ and $c \geq d$

$\{x | x > 0\}$

### Display Math

$$
\sum_{i=1}^{n} x_i = x_1 + x_2 + \cdots + x_n
$$

### Math in Lists

- Inline: $E = mc^2$
- Display in list:
  $$
  F = ma
  $$

### Adjacent Dollar Signs

The price is $100 and $200 (not math).

The formula $x$ costs $50 (mixed).

---

## 17. Mixed Complex Scenarios

### Alert with Table

> [!NOTE]
> Here's a table in an alert:
> 
> | A | B |
> |---|---|
> | 1 | 2 |

### List with Blockquote with Code

- Item
  > Quote
  > ```js
  > code()
  > ```

### Footnote in Table

| Feature | Reference |
|---------|-----------|
| Alpha | See[^fn1] |
| Beta | See[^fn2] |

[^fn1]: Alpha footnote.
[^fn2]: Beta footnote.

---

*End of rendering challenges*
