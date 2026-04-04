# Markdown Edge Cases Test v2

Comprehensive edge cases based on CommonMark spec and GFM quirks.

---

## 1. Table Edge Cases

### Missing Blank Line Before Table (GitHub quirk)

Paragraph immediately before table:
| A | B |
|---|---|
| 1 | 2 |

### Pipe in Code Within Table

| Code | Description |
|------|-------------|
| `a \| b` | Escaped pipe in code |
| `|` | Single pipe in code |
| ``` `|` ``` | Nested backticks with pipe |

### Escaped Pipes

| Raw | Escaped |
|-----|---------|
| a \| b | Works |
| \|\|\| | Multiple pipes |

### Wide and Narrow Columns

| A | BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB |
|---|------------------------------------------|
| x | y |

### Empty Cells and Rows

| A | B | C |
|---|---|---|
|   |   |   |
| x |   | z |

### Alignment Edge Cases

| Left | Center | Right | Default |
|:-----|:------:|------:|---------|
| L | C | R | D |
| **bold** | *italic* | `code` | [link](/) |

---

## 2. Emphasis Edge Cases (The 17 Rules)

### Intra-word Emphasis

This is un*frigging*believable (asterisk works intra-word).
This is un_frigging_believable (underscore does NOT work intra-word).

### Adjacent Punctuation

"*quoted emphasis*" and '*single quoted*'
**"bold in quotes"** and __"underline bold"__

### Nested Emphasis

***bold and italic***
**_bold with italic_**
*__italic with bold__*
___all underscores___

### Tricky Delimiter Matching

**this* text** - mismatched delimiters
*foo *bar* baz* - nested same delimiters
**foo**bar**baz** - adjacent bold
*(*nested parens*)* - emphasis with parens

### Spaces Around Delimiters

* not emphasis * (spaces inside)
*emphasis* works (no spaces)
** not bold ** (spaces inside)

### Punctuation Flanking

*"emphasis"* in quotes
**'bold'** in single quotes
***both*** together
*a]* - emphasis ending with punctuation

---

## 3. Link Reference Ambiguity

### Multiple Bracket Resolution

[foo][bar][baz]

[bar]: /bar-url "Bar"
[baz]: /baz-url "Baz"

### Implicit vs Explicit

[implicit reference][]
[explicit][ref]
[shortcut]

[implicit reference]: /implicit
[ref]: /explicit
[shortcut]: /shortcut

### Nested Brackets in Links

[[nested]](url)
[text [with] brackets](url)
[link](url "title with (parens)")

### Link Definitions with Special Characters

[special]: /url?a=1&b=2 "Title with \"quotes\""
[angles]: </url with spaces>

Test: [special] and [angles]

---

## 4. List Edge Cases

### List Interrupting Paragraph

This is a paragraph.
- This should be a list item
- Another item

Versus with blank line:

This is a paragraph.

- This is clearly a list
- Another item

### Numbered List False Positive

In 1984. George Orwell wrote a famous novel.

In 1984 George Orwell wrote a famous novel.

### Mixed Indentation (2-space vs 4-space)

1. Item one
  - Two-space indent
    - Four-space indent
        - Eight-space indent

### Long Numbered List Indentation

1. Short
10. Medium
100. Long marker
1000. Very long marker
     - Sub-item must align with text

### Empty List Items

* 
* Non-empty
*
* Another non-empty

### Loose vs Tight Detection

Tight:
- a
- b
- c

Loose:
- a

- b

- c

Mixed:
- a
- b

- c

### Task List Edge Cases

- [ ] Unchecked
- [x] Lowercase x
- [X] Uppercase X
- [ ]No space after bracket
- [x]No space checked
-[ ] No space before bracket
- [ ] With **bold** and `code` and [link](/)
- [ ] Multi-line
  continued here

### Nested Task Lists in Blockquotes

> - [ ] Task in quote
>   - [x] Nested task
> - [ ] Another task

---

## 5. Blockquote Edge Cases

### Lazy Continuation

> This is a blockquote
that continues here without >
and here too.

> This stops here.

New paragraph not in quote.

### Consecutive Blockquotes (No Blank Line)

> Quote one.
> Quote two?

Versus:

> Quote one.

> Quote two.

### Nested Blockquotes

> Level 1
>> Level 2
>>> Level 3
>>>> Level 4
>>>>> Level 5

### Blockquote with List

> - Item 1
> - Item 2
>   - Nested
> - Item 3

### Blockquote Code Block

> ```js
> const x = 1;
> ```

> Paragraph after code.

---

## 6. Code Block Edge Cases

### Backtick Precedence in Links

[a backtick (`) in link text](/url)
[`code` in link text](/url)
[link with `code` and more](/url)

### Fenced vs Indented Conflict

```
fenced
```
    indented after fenced

### Triple Backtick Edge Cases

````
Code with ``` inside
````

~~~
Code with ``` inside using tildes
~~~

### Language with Special Chars

```c++
// C++ code
```

```c#
// C# code
```

```objective-c
// Objective-C
```

### Empty Code Blocks

```
```

```js
```

###    Indented Code After List

- List item

      Indented code (8 spaces after list)

- Another item

### Code Span Edge Cases

`` `double backticks` ``
` `` `
`code with trailing space `
` code with leading space`
`multiple   spaces   inside`

---

## 7. HTML Integration Edge Cases

### Emoji in Details/Summary

<details>
<summary>Click 🎉 to expand</summary>

Content with emoji 🚀 inside.

- List item 🔥
- Another item ✅

</details>

### Details with Markdown

<details>
<summary><strong>Bold summary</strong></summary>

**Bold content** with `code` and:

1. Numbered list
2. Second item

| Table | Inside |
|-------|--------|
| a | b |

</details>

### Nested HTML Elements

<div>
<p>Paragraph in div</p>

- List in div

</div>

### HTML Comments

<!-- This is a comment -->

Text after comment.

<!--
Multi-line
comment
-->

More text.

### Inline HTML Mixed with Markdown

This is <em>HTML emphasis</em> and *markdown emphasis*.

<strong>HTML bold</strong> and **markdown bold**.

---

## 8. Special Characters & Escaping

### All Escapable Characters

\! \" \# \$ \% \& \' \( \) \* \+ \, \- \. \/ \: \; \< \= \> \? \@ \[ \\ \] \^ \_ \` \{ \| \} \~

### Backslash at End of Line

Line with backslash\
continues here (hard break).

### HTML Entities

Named: &amp; &lt; &gt; &quot; &apos; &copy; &reg; &trade;
Numeric: &#65; &#x41; &#160;
Invalid: &notarealentity;

### Unicode Edge Cases

Zero-width: ​ (ZWSP between)
RTL: مرحبا (Arabic)
Combining: é vs é (composed vs combining)
Emoji sequences: 👨‍👩‍👧‍👦 (family)
Flags: 🇺🇸 🇬🇧 🇯🇵

---

## 9. Heading Edge Cases

### Headings with Formatting

# Heading with `code` and *italic* and **bold**
## Heading with [link](/) and ~~strike~~
### Heading with emoji 🚀

### Closing Hashes (Optional)

# Heading with closing hashes #
## Also valid ##
### Spaces before closing   ###

### ATX Heading Edge Cases

#Not a heading (no space)
 # Indented one space (still heading)
  # Indented two spaces (still heading)
   # Indented three spaces (still heading)
    # Indented four spaces (code block)

### Empty Headings

# 
##
###

---

## 10. Image Edge Cases

### Image with All Attributes

![Alt text](https://placehold.co/100x50 "Title text")

### Image with Special Characters in Alt

![Alt with "quotes" and <brackets>](https://placehold.co/100x50)

### Image Reference Style

![ref image][img]

[img]: https://placehold.co/100x50 "Reference image"

### Broken Image

![Missing image](https://invalid.invalid/404.png)

### Image in Link

[![Clickable](https://placehold.co/100x50)](https://example.com)

---

## 11. Autolinks and URLs

### Standard Autolinks

<https://example.com>
<http://example.com>
<mailto:test@example.com>
<test@example.com>

### Extended Autolinks (GFM)

https://example.com
www.example.com
test@example.com

### URLs with Special Characters

https://example.com/path?query=a&b=c#anchor
https://example.com/path_(with)_parens
https://example.com/path_with_underscores

### URL Edge Cases in Links

[link](https://example.com/path?a=1&b=2)
[link](<https://example.com/path with spaces>)
[link](https://example.com/path\(escaped\))

---

## 12. Math Edge Cases (if enabled)

### Inline Math

The formula $E = mc^2$ is famous.
Dollar sign: \$100 not math.
Multiple: $a$ and $b$ and $c$.

### Block Math

$$
\frac{a}{b} = \frac{c}{d}
$$

### Math with Special Characters

$x < y$ and $a > b$ in math.
$$
a < b \text{ (comparison)}
$$

---

## 13. Footnote Edge Cases

### Basic Footnotes

Simple[^1] and named[^named].

[^1]: Simple footnote.
[^named]: Named footnote with **formatting**.

### Footnotes with Complex Content

Multi-paragraph[^multi].

[^multi]: First paragraph.

    Second paragraph with code:
    
    ```js
    const x = 1;
    ```
    
    And a list:
    - Item 1
    - Item 2

### Duplicate Footnote References

Same footnote[^dup] used[^dup] multiple[^dup] times.

[^dup]: This appears once but is referenced thrice.

### Unused Footnote Definition

[^unused]: This footnote is defined but never referenced.

---

## 14. Alert Edge Cases (GitHub Style)

### All Alert Types

> [!NOTE]
> Information note.

> [!TIP]
> Helpful tip.

> [!IMPORTANT]
> Important information.

> [!WARNING]
> Warning message.

> [!CAUTION]
> Critical warning.

### Alert with Complex Content

> [!WARNING]
> **Bold warning** with `code` and [link](/).
> 
> - List item 1
> - List item 2
> 
> ```js
> // Code in alert
> ```

### Nested Blockquote in Alert

> [!NOTE]
> Note content.
> > Nested quote inside alert?

---

## 15. Deep Nesting Stress Test

### Deeply Nested Lists

- Level 1
  - Level 2
    - Level 3
      - Level 4
        - Level 5
          - Level 6
            - Level 7
              - Level 8

### Deeply Nested Blockquotes

> 1
>> 2
>>> 3
>>>> 4
>>>>> 5
>>>>>> 6
>>>>>>> 7
>>>>>>>> 8

### Complex Nesting

> - List in quote
>   > Quote in list in quote
>   > - List in quote in list in quote
>   >   ```
>   >   code in list in quote in list in quote
>   >   ```

---

## 16. Whitespace Edge Cases

### Trailing Spaces

Line with trailing spaces   
(should be hard break with 2+ spaces)

### Tabs vs Spaces

	Tab-indented line

    Space-indented line (4 spaces)

### Multiple Blank Lines




Multiple blank lines above (should collapse).

### Line Endings

Unix line ending (LF)
Windows line ending (CRLF - if present)

---

## 17. Edge Cases from Real-World Bugs

### Table After List Without Blank Line

- List item

| A | B |
|---|---|
| 1 | 2 |

### Code Block After Heading Without Blank Line

### Heading
```js
code();
```

### Emphasis Across Lines

*This emphasis
spans lines*

**This bold
spans lines**

### Link Across Lines

[This link
spans lines](url)

---

*End of edge cases test v2*
