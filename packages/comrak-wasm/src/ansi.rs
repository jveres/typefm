use crate::walker::{AstNode, Formatter, walk_and_format};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AnsiTheme {
    pub heading: Option<String>,
    pub heading_h1: Option<String>,
    pub bold: Option<String>,
    pub italic: Option<String>,
    pub strikethrough: Option<String>,
    pub underline: Option<String>,
    pub code: Option<String>,
    pub code_block: Option<String>,
    pub code_block_border: Option<String>,
    pub link: Option<String>,
    pub link_url: Option<String>,
    pub blockquote: Option<String>,
    pub blockquote_border: Option<String>,
    pub thematic_break: Option<String>,
    pub list_bullet: Option<String>,
    pub reset: Option<String>,
    pub show_urls: Option<bool>,
    pub show_markdown: Option<bool>,
    pub table_shadow: Option<String>,
}

impl AnsiTheme {
    pub fn dark() -> Self {
        Self {
            heading: Some("\x1b[1;34m".into()),
            heading_h1: Some("\x1b[1;4;35m".into()),
            bold: Some("\x1b[1m".into()),
            italic: Some("\x1b[3m".into()),
            strikethrough: Some("\x1b[9m".into()),
            underline: Some("\x1b[4m".into()),
            code: Some("\x1b[33m".into()),
            code_block: Some("\x1b[32m".into()),
            code_block_border: Some("\x1b[2m".into()),
            link: Some("\x1b[4;34m".into()),
            link_url: Some("\x1b[2;34m".into()),
            blockquote: Some("\x1b[3;2m".into()),
            blockquote_border: Some("\x1b[2m".into()),
            thematic_break: Some("\x1b[2m".into()),
            list_bullet: Some("\x1b[33m".into()),
            reset: Some("\x1b[0m".into()),
            show_urls: Some(true),
            show_markdown: Some(false),
            table_shadow: Some("░".into()),
        }
    }

    /// Light theme — identical to dark. Standard ANSI codes with `dim`
    /// adapt automatically to the terminal's palette.
    pub fn light() -> Self {
        Self::dark()
    }

    fn merge_with_defaults(self) -> AnsiTheme {
        let d = AnsiTheme::dark();
        macro_rules! merge {
            ($field:ident) => {
                Some(self.$field.unwrap_or_else(|| d.$field.unwrap()))
            };
        }
        AnsiTheme {
            heading: merge!(heading),
            heading_h1: merge!(heading_h1),
            bold: merge!(bold),
            italic: merge!(italic),
            strikethrough: merge!(strikethrough),
            underline: merge!(underline),
            code: merge!(code),
            code_block: merge!(code_block),
            code_block_border: merge!(code_block_border),
            link: merge!(link),
            link_url: merge!(link_url),
            blockquote: merge!(blockquote),
            blockquote_border: merge!(blockquote_border),
            thematic_break: merge!(thematic_break),
            list_bullet: merge!(list_bullet),
            reset: merge!(reset),
            show_urls: merge!(show_urls),
            show_markdown: merge!(show_markdown),
            table_shadow: self.table_shadow,
        }
    }

    fn g(&self, key: &str) -> &str {
        match key {
            "heading" => self.heading.as_deref().unwrap_or(""),
            "heading_h1" => self.heading_h1.as_deref().unwrap_or(""),
            "bold" => self.bold.as_deref().unwrap_or(""),
            "italic" => self.italic.as_deref().unwrap_or(""),
            "strikethrough" => self.strikethrough.as_deref().unwrap_or(""),
            "underline" => self.underline.as_deref().unwrap_or(""),
            "code" => self.code.as_deref().unwrap_or(""),
            "code_block" => self.code_block.as_deref().unwrap_or(""),
            "code_block_border" => self.code_block_border.as_deref().unwrap_or(""),
            "link" => self.link.as_deref().unwrap_or(""),
            "link_url" => self.link_url.as_deref().unwrap_or(""),
            "blockquote" => self.blockquote.as_deref().unwrap_or(""),
            "blockquote_border" => self.blockquote_border.as_deref().unwrap_or(""),
            "thematic_break" => self.thematic_break.as_deref().unwrap_or(""),
            "list_bullet" => self.list_bullet.as_deref().unwrap_or(""),
            "reset" => self.reset.as_deref().unwrap_or(""),
            _ => "",
        }
    }
}

impl Default for AnsiTheme {
    fn default() -> Self { Self::dark() }
}

struct AnsiFormatter {
    theme: AnsiTheme,
}

pub fn format_ansi<'a>(root: &'a AstNode<'a>, theme: Option<AnsiTheme>) -> String {
    let theme = match theme {
        Some(t) => t.merge_with_defaults(),
        None => AnsiTheme::default(),
    };
    let fmt = AnsiFormatter { theme };
    walk_and_format(root, &fmt)
}

impl Formatter for AnsiFormatter {
    fn show_urls(&self) -> bool { self.theme.show_urls.unwrap_or(true) }
    fn show_markdown(&self) -> bool { self.theme.show_markdown.unwrap_or(false) }

    fn style(&self, out: &mut String, name: &str) {
        out.push_str(self.theme.g(name));
    }
    fn reset(&self, out: &mut String) {
        out.push_str(self.theme.g("reset"));
    }

    // H1 gets underline variant; H2+ get regular heading color
    fn heading_start(&self, out: &mut String, level: u8) {
        out.push_str(if level == 1 { self.theme.g("heading_h1") } else { self.theme.g("heading") });
    }
    fn heading_end(&self, out: &mut String) {
        self.reset(out);
    }

    // Styled blockquote prefix and italic text
    fn quote_prefix(&self, out: &mut String) {
        out.push_str(self.theme.g("blockquote_border"));
        out.push_str("│");
        self.reset(out);
        out.push(' ');
    }
    fn blockquote_text_start(&self, out: &mut String) {
        out.push_str(self.theme.g("blockquote"));
    }
    fn blockquote_text_end(&self, out: &mut String) {
        self.reset(out);
    }

    // Colored alert badges
    fn alert_title(&self, out: &mut String, alert: &comrak::nodes::NodeAlert) {
        let bg = match alert.alert_type {
            comrak::nodes::AlertType::Note => "\x1b[1;97;44m",
            comrak::nodes::AlertType::Tip => "\x1b[1;97;42m",
            comrak::nodes::AlertType::Important => "\x1b[1;97;45m",
            comrak::nodes::AlertType::Warning => "\x1b[1;97;43m",
            comrak::nodes::AlertType::Caution => "\x1b[1;97;41m",
        };
        let title = alert.title.as_deref().unwrap_or(alert.alert_type.default_title());
        out.push_str(bg);
        out.push(' ');
        out.push_str(title);
        out.push(' ');
        self.reset(out);
    }

    fn table_shadow_char(&self) -> Option<&str> {
        self.theme.table_shadow.as_deref()
    }
}
